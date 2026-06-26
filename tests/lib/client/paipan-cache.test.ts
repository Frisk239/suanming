// tests/lib/client/paipan-cache.test.ts
// 未登录本地暂存单测（spec 第 4 节）。纯函数 + localStorage mock。

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { paipanKey, savePaipanCache, loadPaipanCache } from '@/lib/client/paipan-cache';
import type { ChartInput } from '@/types/bazi';

const baseInput: ChartInput = {
  gender: 'male',
  solarDate: '1990-06-15 22:37',
  longitude: 116.4,
  latitude: 39.9,
};

// mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { for (const k of Object.keys(store)) delete store[k]; },
};
vi.stubGlobal('localStorage', localStorageMock);

beforeEach(() => {
  localStorageMock.clear();
});

describe('paipan-cache · key 生成', () => {
  it('相同核心字段生成相同 key', () => {
    expect(paipanKey(baseInput)).toBe(paipanKey({ ...baseInput }));
  });

  it('归一化默认值：不传 useTrueSolar/sect 与传默认值同 key', () => {
    const noDefaults: ChartInput = { gender: 'male', solarDate: '1990-06-15 22:37', longitude: 116.4, latitude: 39.9 };
    const withDefaults: ChartInput = { ...noDefaults, useTrueSolar: true, sect: 1 };
    expect(paipanKey(noDefaults)).toBe(paipanKey(withDefaults));
  });

  it('不同生辰生成不同 key', () => {
    const a = paipanKey(baseInput);
    const b = paipanKey({ ...baseInput, solarDate: '1988-01-01 06:00' });
    expect(a).not.toBe(b);
  });

  it('name 不影响 key（不参与排盘计算）', () => {
    expect(paipanKey(baseInput)).toBe(paipanKey({ ...baseInput, name: '张三' }));
  });
});

describe('paipan-cache · 存读', () => {
  it('save 后 load 能取回 chart + analysis', () => {
    const chart = { solarDate: '1990-06-15 22:37' } as any;
    const analysis = { strength: { level: '偏弱' } } as any;
    savePaipanCache(baseInput, chart, analysis);
    const loaded = loadPaipanCache(baseInput);
    expect(loaded).not.toBeNull();
    expect(loaded?.chart).toEqual(chart);
    expect(loaded?.analysis).toEqual(analysis);
  });

  it('未存时 load 返回 null', () => {
    expect(loadPaipanCache(baseInput)).toBeNull();
  });

  it('超过 7 天的缓存视为过期返回 null', () => {
    savePaipanCache(baseInput, {} as any, {} as any);
    // 篡改 savedAt 为 8 天前
    const key = paipanKey(baseInput);
    const expired = { ...JSON.parse(store[key]), savedAt: Date.now() - 8 * 86400000 };
    store[key] = JSON.stringify(expired);
    expect(loadPaipanCache(baseInput)).toBeNull();
  });

  it('JSON 损坏时 load 返回 null 不抛', () => {
    store[paipanKey(baseInput)] = '{not json';
    expect(loadPaipanCache(baseInput)).toBeNull();
  });
});
