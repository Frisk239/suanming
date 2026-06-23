// tests/lib/bazi-engine/pattern.test.ts
import { describe, it, expect } from 'vitest';
import { determinePattern } from '@/lib/bazi-engine/core/pattern';
import { calculateStrength } from '@/lib/bazi-engine/core/strength';
import { adaptBaziCore } from '@/lib/bazi/bazi-core-adapter';
import type { ChartInput } from '@/types/bazi';

const input: ChartInput = {
  gender: 'male',
  solarDate: '1990-06-15 22:37',
  longitude: 116.41,
  latitude: 39.9,
  useTrueSolar: true,
  sect: 1,
};
const chart = adaptBaziCore(input);
const strength = calculateStrength(chart);

describe('determinePattern · 1990-06-15 辛日午月', () => {
  it('应为七杀格（青囊抓包：月令午本气丁七杀定格）', () => {
    const p = determinePattern(chart, strength);
    expect(p.name).toBe('七杀格');
  });
  it('立格依据应为本气七杀暗藏（对齐青囊 basis）', () => {
    const p = determinePattern(chart, strength);
    // 青囊 basis: "月令本气丁(七杀)暗藏立格"
    expect(p.basis).toContain('丁');
    expect(p.basis).toContain('七杀');
    expect(p.basis).toContain('暗藏');
  });
  it('格局类型应为正格或变格', () => {
    const p = determinePattern(chart, strength);
    expect(['正格', '变格']).toContain(p.type);
  });
});
