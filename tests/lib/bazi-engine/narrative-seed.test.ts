// tests/lib/bazi-engine/narrative-seed.test.ts
import { describe, it, expect } from 'vitest';
import { generateNarrativeSeeds } from '@/lib/bazi-engine/core/narrative-seed';
import { adaptBaziCore } from '@/lib/bazi/bazi-core-adapter';
import { calculateStrength } from '@/lib/bazi-engine/core/strength';
import { determinePattern } from '@/lib/bazi-engine/core/pattern';
import { selectYongshen } from '@/lib/bazi-engine/core/yongshen';
import { assessDayuns } from '@/lib/bazi-engine/core/dayun';
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
const dayuns = assessDayuns(chart, yongshen, strength);

describe('generateNarrativeSeeds', () => {
  it('每步大运应至少生成 3 条种子（基调+定性+气势）', () => {
    for (const dy of dayuns) {
      const seeds = generateNarrativeSeeds(dy, yongshen, pattern, chart);
      expect(seeds.length).toBeGreaterThanOrEqual(3);
    }
  });
  it('good 大运的种子应含"顺应"（对齐青囊模板）', () => {
    const goodDy = dayuns.find((d) => d.assessment.tier === 'good');
    expect(goodDy).toBeDefined();
    const seeds = generateNarrativeSeeds(goodDy!, yongshen, pattern, chart);
    expect(seeds.some((s) => s.includes('顺应'))).toBe(true);
  });
  it('丙戌大运应含"天干丙合日干辛"引动句（丙辛合化水）', () => {
    const bingXu = dayuns.find((d) => d.ganZhi === '丙戌');
    expect(bingXu).toBeDefined();
    const seeds = generateNarrativeSeeds(bingXu!, yongshen, pattern, chart);
    expect(seeds.some((s) => s.includes('丙') && s.includes('合') && s.includes('辛'))).toBe(true);
  });
  it('丙戌应属喜神（火生用神土）', () => {
    const bingXu = dayuns.find((d) => d.ganZhi === '丙戌')!;
    const seeds = generateNarrativeSeeds(bingXu, yongshen, pattern, chart);
    expect(seeds.some((s) => s.includes('喜神'))).toBe(true);
  });
});
