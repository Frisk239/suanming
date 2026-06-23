// tests/lib/bazi-engine/analyze.test.ts
// 端到端：M1 chart → analyzeBazi → 对照青囊抓包做"方向对齐"验收（spec 2.8）。
import { describe, it, expect } from 'vitest';
import { analyzeBazi } from '@/lib/bazi-engine';
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

describe('analyzeBazi · 端到端对照青囊抓包（方向对齐）', () => {
  const chart = adaptBaziCore(input);
  const result = analyzeBazi(chart);

  // ① strength（青囊：score=-52, level=偏弱）
  it('strength 方向：偏弱/极弱/中和（不能偏强/极强）', () => {
    expect(['偏弱', '极弱', '中和']).toContain(result.strength.level);
    expect(result.strength.level).not.toBe('偏强');
    expect(result.strength.level).not.toBe('极强');
  });
  it('strength 得令应为负（辛金午月，火克金）', () => {
    expect(result.strength.breakdown.deLing).toBeLessThan(0);
  });

  // ② pattern（青囊：七杀格）
  it('pattern：应为七杀格（青囊：月令午本气丁七杀定格）', () => {
    expect(result.pattern.name).toBe('七杀格');
  });

  // ③ yongshen（青囊：用神土, 喜土金水, 忌木火）
  it('yongshen：用神应为土（青囊：七杀格印化）', () => {
    expect(result.yongshen.primary).toBe('土');
  });
  it('yongshen：用神与忌神不矛盾', () => {
    expect(result.yongshen.avoid).not.toContain(result.yongshen.primary);
  });
  it('yongshen：忌神应含木或火（方向对齐青囊忌木火）', () => {
    expect(result.yongshen.avoid.some((w) => ['木', '火'].includes(w))).toBe(true);
  });

  // ④ daYuns（青囊：丙戌第4步 score=34 tier=good）
  it('daYuns：≥8 步，每步含 assessment + narrativeSeed', () => {
    expect(result.daYuns.length).toBeGreaterThanOrEqual(8);
    for (const dy of result.daYuns) {
      expect(dy.assessment).toBeDefined();
      expect(dy.assessment.tier).toMatch(/good|neutral|bad/);
      expect(dy.narrativeSeed.length).toBeGreaterThan(0);
    }
  });
  it('daYuns：丙戌 tier 不能是 bad（青囊为 good，趋势一致）', () => {
    const bingXu = result.daYuns.find((d) => d.ganZhi === '丙戌');
    expect(bingXu).toBeDefined();
    expect(bingXu!.assessment.tier).not.toBe('bad');
  });
  it('daYuns：丙戌应为 good（火生用神土，属喜神）', () => {
    const bingXu = result.daYuns.find((d) => d.ganZhi === '丙戌');
    expect(bingXu!.assessment.tier).toBe('good');
  });

  // 结构完整性
  it('result 四大件齐全', () => {
    expect(result.strength).toBeDefined();
    expect(result.pattern).toBeDefined();
    expect(result.yongshen).toBeDefined();
    expect(Array.isArray(result.daYuns)).toBe(true);
  });
});
