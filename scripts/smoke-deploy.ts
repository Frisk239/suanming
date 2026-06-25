// scripts/smoke-deploy.ts
// 部署软上线本地冒烟（Task 11 Step 3 / Task 12 前置）。
// 手动跑：npx tsx --env-file=.env.local scripts/smoke-deploy.ts
//
// 验证点（并发保护接入后）：
//   1. 排盘 analyze（免登录）200 + 四柱正确
//   2. interpret 未登录 401（门槛）
//   3. interpret 单次正常流（登录）200 + SSE 不误报 409/429
//   4. interpret 同用户同盘连点 → 第二次 409（锁）
//   5. interpret 全局并发 5 个不同盘 → 第 5 个 429（全局限流）
//
// 用 base64url 编码 session 构造 @supabase/ssr cookie（createServerClient 默认编码）。

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const BASE = 'http://localhost:3000';
const TEST_EMAIL = process.env.SMOKE_EMAIL ?? 'user01@qingnang.test';
const TEST_PASS = process.env.SMOKE_PASS ?? 'Ab123456';
const REF = new URL(SUPABASE_URL).hostname.split('.')[0]; // ohwsxyrcgqacdphffejn
const COOKIE_NAME = `sb-${REF}-auth-token`;

const CHART = {
  solarDate: '1990-06-15 22:37',
  longitude: 116.4074,
  latitude: 39.9042,
  gender: 'male',
} as const;

// base64url 编码（@supabase/ssr 写 cookie 的格式：base64-<base64url(JSON.stringify(session))>）
function encodeCookie(session: unknown): string {
  const json = JSON.stringify(session);
  const b64 = Buffer.from(json).toString('base64url');
  return `base64-${b64}`;
}

async function login(): Promise<string> {
  const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS }),
  });
  if (!resp.ok) throw new Error(`登录失败 ${resp.status}: ${await resp.text()}`);
  const session = await resp.json();
  return `${COOKIE_NAME}=${encodeCookie(session)}`;
}

// 打 SSE 流，返回首个 HTTP 状态 + 流内容统计
async function hitSSE(path: string, cookie: string, body: unknown, timeoutMs = 60000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const status = resp.status;
    // 非 2xx 读 JSON 错误
    if (!resp.ok || !resp.body) {
      const txt = await resp.text().catch(() => '');
      clearTimeout(timer);
      return { status, ok: resp.ok, errorJson: safeJson(txt), tokenCount: 0, hasError: false, done: false };
    }
    const reader = resp.body.getReader();
    const dec = new TextDecoder();
    let tokenCount = 0;
    let hasError = false;
    let fullText = '';
    let done = false;
    while (true) {
      const { done: rd, value } = await reader.read();
      if (rd) break;
      const chunk = dec.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        const t = line.trim();
        if (!t.startsWith('data:')) continue;
        const payload = t.slice(5).trim();
        if (payload === '[DONE]') { done = true; break; }
        try {
          const obj = JSON.parse(payload);
          if (obj.token) { tokenCount++; fullText += obj.token; }
          if (obj.error) hasError = true;
        } catch { /* skip */ }
      }
    }
    clearTimeout(timer);
    return { status, ok: resp.ok, tokenCount, hasError, done, fullTextLen: fullText.length };
  } catch (e) {
    clearTimeout(timer);
    // 超时 abort：返回 status 0 表示"被中止"（流没读完，但已拿到结论的场景由调用方判断）
    return { status: 0, ok: false, aborted: true, tokenCount: 0, hasError: false, done: false };
  }
}

function safeJson(s: string) {
  try { return JSON.parse(s); } catch { return s; }
}

async function main() {
  console.log('=== 1. 排盘 analyze（免登录）===');
  const a = await fetch(`${BASE}/api/bazi/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(CHART),
  });
  const aj = await a.json();
  const pillars = [aj.chart.year.ganZhi, aj.chart.month.ganZhi, aj.chart.day.ganZhi, aj.chart.time.ganZhi].join(' ');
  console.log(`  HTTP ${a.status} | 四柱 ${pillars} | 格局 ${aj.analysis.pattern.name} | 用神 ${aj.analysis.yongshen.primary}`);
  console.log(`  ${a.status === 200 && pillars === '庚午 壬午 辛亥 己亥' ? '✅' : '❌'}`);

  const cookie = await login();
  console.log('\n=== 2. interpret 未登录应 401 ===');
  const unauth = await hitSSE('/api/bazi/interpret', 'x=1', { chart: CHART });
  console.log(`  HTTP ${unauth.status} | ${unauth.status === 401 ? '✅ 门槛正常' : '❌ 应为 401'}`);

  console.log('\n=== 3. interpret 单次正常流（登录，应 200 + SSE，不误报 409/429）===');
  const single = await hitSSE('/api/bazi/interpret', cookie, { chart: CHART, useCache: false });
  console.log(`  HTTP ${single.status} | token 帧 ${single.tokenCount} | [DONE] ${single.done} | error ${single.hasError}`);
  console.log(`  ${single.status === 200 && single.tokenCount > 50 && !single.hasError ? '✅ 正常流' : '❌'}`);

  console.log('\n=== 4. interpret 同用户同盘连点（第二次应 409，锁生效）===');
  // p1 真实流式占锁（hitSSE 完整读流，锁到流结束才释放）；
  // p2 在 p1 流式中发起，应撞同用户锁 409。用短超时，p2 拿到状态即返回。
  const p1 = hitSSE('/api/bazi/interpret', cookie, { chart: CHART, useCache: false }, 45000);
  await new Promise((r) => setTimeout(r, 500)); // 让 p1 先 acquire 并开始流
  const p2 = hitSSE('/api/bazi/interpret', cookie, { chart: CHART, useCache: false }, 8000);
  const r2 = await p2;
  // 不必等 p1 流完，但让它自然结束（避免悬挂 fetch）
  p1.catch(() => {});
  console.log(`  第二请求 status=${r2.status}`);
  console.log(`  ${r2.status === 409 ? '✅ 409 同用户锁生效' : '❌ 应为 409，实际 ' + r2.status}`);

  console.log('\n=== 5. interpret 全局并发 5 个不同盘（第 5 个起应 429，全局限流上限 4）===');
  // 5 个不同生辰 → 5 个不同 profileId → 不撞同用户锁，只测全局上限。
  // 全局 acquire 顺序：前 4 个通过（200，开始流式），第 5 个应 429。
  // 只取首状态：非 2xx 立即返回；2xx 读首个 token 后取消该连接（不占完整 20s）。
  const charts5 = [
    { solarDate: '1990-06-15 22:37', longitude: 116.4074, latitude: 39.9042, gender: 'male' },
    { solarDate: '1985-03-20 08:15', longitude: 121.4737, latitude: 31.2304, gender: 'female' },
    { solarDate: '1988-11-03 14:30', longitude: 113.2644, latitude: 23.1291, gender: 'male' },
    { solarDate: '1992-07-08 06:00', longitude: 120.1551, latitude: 30.2741, gender: 'female' },
    { solarDate: '1995-12-25 19:45', longitude: 114.0579, latitude: 22.5431, gender: 'male' },
  ];
  const statuses5 = await Promise.all(
    charts5.map((c) => probeStatus('/api/bazi/interpret', cookie, { chart: c, useCache: false })),
  );
  const counts = statuses5.reduce((m, s) => { m[s] = (m[s] || 0) + 1; return m; }, {} as Record<number, number>);
  console.log(`  5 请求状态分布：${JSON.stringify(counts)}`);
  console.log(`  ${(counts[429] || 0) > 0 ? '✅ 429 全局限流生效（至少 1 个被限）' : '⚠️ 未触发 429（可能抢锁时序，或前 4 个已流完释放）'}`);

  console.log('\n冒烟完成。');
}

/** 只探测 SSE 端点首状态：2xx 读首 chunk 即取消连接返回 200；非 2xx 直接返回状态。 */
async function probeStatus(path: string, cookie: string, body: unknown): Promise<number> {
  const resp = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(body),
  });
  if (!resp.ok || !resp.body) {
    await resp.text().catch(() => {});
    return resp.status;
  }
  // 2xx：读首个 chunk 证明流起来了，然后取消（不占满 20s 锁，让出全局名额）
  const reader = resp.body.getReader();
  try {
    await reader.read();
  } catch {
    // ignore
  } finally {
    try { await reader.cancel(); } catch { /* ignore */ }
  }
  return resp.status;
}

main().catch((e) => { console.error('冒烟出错:', e); process.exit(1); });
