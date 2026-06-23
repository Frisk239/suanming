// tests/lib/bazi-engine/dayun.test.ts
import { describe, it, expect } from 'vitest';
import { assessDayuns } from '@/lib/bazi-engine/core/dayun';
import { calculateStrength } from '@/lib/bazi-engine/core/strength';
import { determinePattern } from '@/lib/bazi-engine/core/pattern';
import { selectYongshen } from '@/lib/bazi-engine/core/yongshen';
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
const dayuns = assessDayuns(chart, yongshen, strength);

describe('assessDayuns · 1990-06-15', () => {
  it('应有 8 步以上大运（M1 排盘契约）', () => {
    expect(dayuns.length).toBeGreaterThanOrEqual(8);
  });
  it('丙戌大运 tier 应为 good（青囊抓包：丙火生用神土，属喜神）', () => {
    const bingXu = dayuns.find((d) => d.ganZhi === '丙戌');
    expect(bingXu).toBeDefined();
    expect(bingXu!.assessment.tier).toBe('good');
  });
  it('good 的 score 应为正，neutral 为 0 附近，bad 为负', () => {
    for (const d of dayuns) {
      if (d.assessment.tier === 'good') expect(d.assessment.score).toBeGreaterThan(0);
      if (d.assessment.tier === 'bad') expect(d.assessment.score).toBeLessThan(0);
    }
  });
  it('每步大运应保留起止年龄/年份', () => {
    for (const d of dayuns) {
      expect(typeof d.startAge).toBe('number');
      expect(typeof d.endYear).toBe('number');
      expect(d.ganZhi.length).toBe(2);
    }
  });
});
