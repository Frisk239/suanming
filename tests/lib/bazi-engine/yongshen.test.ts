// tests/lib/bazi-engine/yongshen.test.ts
import { describe, it, expect } from 'vitest';
import { selectYongshen } from '@/lib/bazi-engine/core/yongshen';
import { calculateStrength } from '@/lib/bazi-engine/core/strength';
import { determinePattern } from '@/lib/bazi-engine/core/pattern';
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
const pattern = determinePattern(chart, strength);
const yongshen = selectYongshen(chart, strength, pattern);

describe('selectYongshen · 1990-06-15 辛日七杀格', () => {
  it('用神应为土（青囊抓包：七杀格印化，土为辛金之印）', () => {
    expect(yongshen.primary).toBe('土');
  });
  it('用神与忌神不能相同', () => {
    expect(yongshen.avoid).not.toContain(yongshen.primary);
  });
  it('忌神应含木或火之一（方向对齐青囊：用神土，忌木火）', () => {
    expect(yongshen.avoid.some((w) => ['木', '火'].includes(w))).toBe(true);
  });
  it('七杀格取用方法应为格局（杀印相生）', () => {
    expect(yongshen.method).toBe('格局');
  });
  it('闲神应为用喜忌之外的五行', () => {
    // 用神土，喜含火/土，忌含木/水 → 闲神应不含这四类中的独占项
    const allUsed = new Set([yongshen.primary, ...yongshen.favor, ...yongshen.avoid]);
    for (const x of yongshen.xian) {
      expect(allUsed.has(x)).toBe(false);
    }
  });
  it('advice 应含用神与方法说明', () => {
    expect(yongshen.advice).toContain('用神');
    expect(yongshen.advice).toContain('土');
  });
});
