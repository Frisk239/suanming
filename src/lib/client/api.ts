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
  const resp = await fetch('/api/bazi/interpret', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chart: input, persona: options.persona, depth: options.depth }),
    signal: cb.signal,
  });
  // 非 2xx：401=未登录（详批门槛），其他=同步阶段（排盘/解读/检索）失败。
  // 401 带 __NEEDS_AUTH__: 前缀，InterpretPanel 据此展示登录引导（而非普通错误）。
  if (!resp.ok || !resp.body) {
    const e = await resp.json().catch(() => ({}));
    if (resp.status === 401) {
      cb.onError(`__NEEDS_AUTH__:${e.error ?? '请先登录'}`);
    } else {
      cb.onError(e.error ?? `详批失败 ${resp.status}`);
    }
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  // SSE 按行分割；保留最后一段不完整行到 buf，下次拼接
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? ''; // 最后一段可能不完整，留作下次
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === '[DONE]') {
        cb.onDone();
        return;
      }
      try {
        const obj = JSON.parse(payload) as { token?: string; error?: string };
        if (obj.token) cb.onToken(obj.token);
        else if (obj.error) cb.onError(obj.error);
      } catch {
        // 非 JSON 帧跳过（如 SSE 注释行 : keepalive）
      }
    }
  }
  // 流自然结束（无显式 [DONE]）也视为完成
  cb.onDone();
}
