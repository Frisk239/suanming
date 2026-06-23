// tests/lib/bazi-engine/strength.test.ts
import { describe, it, expect } from 'vitest';
import { calculateStrength } from '@/lib/bazi-engine/core/strength';
import { adaptBaziCore } from '@/lib/bazi/bazi-core-adapter';
import type { ChartInput } from '@/types/bazi';

// 1990-06-15 22:37 北京 男 —— 青囊抓包同案例。用经纬度绕过 Windows 中文城市编码。
const input: ChartInput = {
  gender: 'male',
  solarDate: '1990-06-15 22:37',
  longitude: 116.41,
  latitude: 39.9,
  useTrueSolar: true,
  sect: 1,
};
const chart = adaptBaziCore(input);

describe('calculateStrength · 1990-06-15 辛日午月', () => {
  it('日主应为辛金（M1 排盘契约）', () => {
    expect(chart.day.gan).toBe('辛');
  });
  it('应判为偏弱（青囊抓包方向一致：不能偏强/极强）', () => {
    const s = calculateStrength(chart);
    expect(['偏弱', '极弱', '中和']).toContain(s.level);
    expect(s.level).not.toBe('偏强');
    expect(s.level).not.toBe('极强');
  });
  it('得令应为负（辛金生于午火月，火克金，不得令）', () => {
    const s = calculateStrength(chart);
    expect(s.breakdown.deLing).toBeLessThan(0);
  });
  it('综合分应为负或接近 0（偏弱方向，非身强正分）', () => {
    const s = calculateStrength(chart);
    // 案例手算：deLing -1 + deDi ~0.06 + deShi 1.7 ≈ 0.76；落 [-1,1) 偏弱
    expect(s.score).toBeLessThan(1);
  });
  it('三得布尔：辛日午月应不得令', () => {
    const s = calculateStrength(chart);
    expect(s.deLingBool).toBe(false);
  });
  it('breakdown.dongTai 应为 0（MVP 缺口）', () => {
    const s = calculateStrength(chart);
    expect(s.breakdown.dongTai).toBe(0);
  });
});
