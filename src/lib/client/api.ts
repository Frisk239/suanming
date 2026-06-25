// src/lib/client/api.ts
// 前端 fetch 封装（spec 5.6/5.7）。三个后端 API 的客户端调用：
//   - fetchChart:      ①层排盘 POST /api/bazi/chart
//   - fetchAnalysis:   ②层解读 POST /api/bazi/analyze（一次拿 chart + analysis）
//   - streamInterpret: ③层详批 POST /api/bazi/interpret（SSE 流式）
//
// 统一错误处理：非 2xx 时解析后端 { error } 字段抛出可读信息。
// SSE 消费：fetch + ReadableStream + TextDecoder（非 EventSource，因 interpret 是 POST）。

import type { ChartInput, BaziChart } from '@/types/bazi';
import type { BaziAnalysisResult } from '@/lib/bazi-engine';
import type { InterpretOptions } from '@/types/ui';
import { parseSSEStream } from './sse';

/** 429 指数退避 sleep（spec 6.3） */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** ①层排盘：POST /api/bazi/chart → { chart } */
export async function fetchChart(
  input: ChartInput,
): Promise<BaziChart> {
  const resp = await fetch('/api/bazi/chart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!resp.ok) {
    const e = await resp.json().catch(() => ({}));
    throw new Error(e.error ?? `排盘失败 ${resp.status}`);
  }
  const data = await resp.json();
  return data.chart as BaziChart;
}

/**
 * ②层解读：POST /api/bazi/analyze → { chart, analysis, profileId? }
 * 后端内部先①层排盘再②层解读，一次返回（spec 5.6 串行调用的优化合并版）。
 * 入参是 ChartInput（与 chart 端点一致），不是排盘 JSON。
 * M7：登录用户后端建 birth_profile 并返回 profileId（追问用），未登录无此字段。
 */
export async function fetchAnalysis(
  input: ChartInput,
): Promise<{ chart: BaziChart; analysis: BaziAnalysisResult; profileId?: string }> {
  const resp = await fetch('/api/bazi/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!resp.ok) {
    const e = await resp.json().catch(() => ({}));
    throw new Error(e.error ?? `解读失败 ${resp.status}`);
  }
  return resp.json();
}

/**
 * ③层详批：POST /api/bazi/interpret → SSE 流。
 *
 * SSE 帧格式（后端 interpret/route.ts 实测）：
 *   data: {"token":"..."}\n\n   每个 LLM token
 *   data: {"error":"..."}\n\n   LLM 调用失败（流中途）
 *   data: [DONE]\n\n            流结束
 *
 * @param input   排盘入参（后端内部自行排盘+解读+检索）
 * @param options 人格/深度
 * @param cb      回调：onToken(每 token)、onError(错误信息)、onDone(完成)、signal(abort)
 */
export async function streamInterpret(
  input: ChartInput,
  options: InterpretOptions,
  cb: {
    onToken: (t: string) => void;
    onError: (e: string) => void;
    onDone: () => void;
    signal?: AbortSignal;
  },
): Promise<void> {
  const body = JSON.stringify({ chart: input, persona: options.persona, depth: options.depth });
  let resp: Response;
  // 429 指数退避重试（spec 6.3）：1s/2s，最多 3 次
  for (let attempt = 0; attempt < 3; attempt++) {
    resp = await fetch('/api/bazi/interpret', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: cb.signal,
    });
    if (resp.status !== 429) break;
    if (attempt < 2) await sleep(1000 * 2 ** attempt); // 1s, 2s（第3次不再等）
  }
  // 429 重试用尽 → parseSSEStream 因 !resp.ok 透传「当前使用人数较多」文案
  // 409/401/其他非 ok → parseSSEStream 同样透传 {error} 文案（401 带 __NEEDS_AUTH__: 前缀）
  await parseSSEStream(resp!, {
    onToken: cb.onToken,
    onError: cb.onError,
    onDone: cb.onDone,
  });
}
