// src/lib/client/paipan-cache.ts
// 未登录用户「最近一盘」本地暂存（spec 第 4 节）。
// 只服务未登录用户在 /bazi 的便利；登录用户走服务端快照，不读写本地。
//
// key 含归一化后的排盘核心字段，换输入即不同 key，防串盘。
// 过期：7 天（启发式，代理 engine_version 失效——localStorage 不存引擎版本号）。

import type { ChartInput } from '@/types/bazi';
import type { BaziChart } from '@/types/bazi';
import type { BaziAnalysisResult } from '@/lib/bazi-engine';

const EXPIRY_MS = 7 * 86400000; // 7 天

/** 归一化核心字段生成 key。name/isLunar 不参与（不影响排盘计算）。 */
export function paipanKey(input: ChartInput): string {
  const lng = input.longitude ?? 0;
  const lat = input.latitude ?? 0;
  const ts = input.useTrueSolar ?? true; // 归一化默认值
  const sect = input.sect ?? 1;          // 归一化默认值
  return `paipan:last:${input.gender}:${input.solarDate}:${lng}:${lat}:${ts}:${sect}`;
}

interface CacheEntry {
  chart: BaziChart;
  analysis: BaziAnalysisResult;
  savedAt: number;
}

/** 存最近一盘（仅未登录调用）。localStorage 异常静默忽略。 */
export function savePaipanCache(
  input: ChartInput,
  chart: BaziChart,
  analysis: BaziAnalysisResult,
): void {
  try {
    localStorage.setItem(
      paipanKey(input),
      JSON.stringify({ chart, analysis, savedAt: Date.now() } satisfies CacheEntry),
    );
  } catch {
    // localStorage 满/禁用，忽略
  }
}

/** 读最近一盘。未存/过期/损坏返回 null。 */
export function loadPaipanCache(input: ChartInput): CacheEntry | null {
  try {
    const raw = localStorage.getItem(paipanKey(input));
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    if (Date.now() - entry.savedAt > EXPIRY_MS) return null; // 过期
    return entry;
  } catch {
    return null; // JSON 损坏或 localStorage 异常
  }
}
