// tests/lib/bazi-engine/knowledge-extra.test.ts
import { describe, it, expect } from 'vitest';
import { MONTH_SUPPORT, getMonthSupport } from '@/lib/bazi-engine/knowledge/month-support';
import { getTiaohouWuxing, TIAO_HOU_TABLE } from '@/lib/bazi-engine/knowledge/tiaohou-table';
import { GE_PRIORITY, PATTERN_MAP, BIAN_GE_NAMES, MAJOR_PATTERNS } from '@/lib/bazi-engine/knowledge/pattern-definitions';

describe('月令旺衰表（严格对齐 tianji day_master.py:32）', () => {
  it('12 月支 × 5 五行 全填', () => {
    for (const z of ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']) {
      expect(MONTH_SUPPORT[z]).toBeDefined();
      expect(Object.keys(MONTH_SUPPORT[z]).length).toBe(5);
    }
  });
  it('午月火得令分 3', () => {
    expect(getMonthSupport('午', '火')).toBe(3);
  });
  it('子月水得令分 3', () => {
    expect(getMonthSupport('子', '水')).toBe(3);
  });
  it('辰月土分 2（tianji 自定义，非标准旺3）', () => {
    expect(getMonthSupport('辰', '土')).toBe(2);
    // 辰月金=0（tianji 自定义）
    expect(getMonthSupport('辰', '金')).toBe(0);
  });
  it('未月土分 2（tianji 自定义）', () => {
    expect(getMonthSupport('未', '土')).toBe(2);
  });
  it('未知月支返回 0', () => {
    expect(getMonthSupport('?', '火')).toBe(0);
  });
});

describe('调候表（完整 120 条）', () => {
  it('10 干 × 12 月 = 120 条', () => {
    const gans = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const zhis = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    let count = 0;
    for (const g of gans) {
      for (const z of zhis) {
        if (TIAO_HOU_TABLE[g]?.[z]) count++;
      }
    }
    expect(count).toBe(120);
  });
  it('甲寅月调候用神含火（丙为主）', () => {
    expect(getTiaohouWuxing('甲', '寅')).toBe('火');
  });
  it('辛午月调候用神含水（壬为主）', () => {
    expect(getTiaohouWuxing('辛', '午')).toBe('水');
  });
  it('丙寅月调候用神含水（壬为主）', () => {
    expect(getTiaohouWuxing('丙', '寅')).toBe('水');
  });
  it('庚寅月调候用神含火（丁为主）', () => {
    expect(getTiaohouWuxing('庚', '寅')).toBe('火');
  });
});

describe('格局定义', () => {
  it('七杀优先级 1', () => {
    expect(GE_PRIORITY['七杀']).toBe(1);
  });
  it('食伤优先级 4', () => {
    expect(GE_PRIORITY['食神']).toBe(4);
  });
  it('七杀映射七杀格', () => {
    expect(PATTERN_MAP['七杀']).toBe('七杀格');
  });
  it('变格至少 12 种', () => {
    expect(BIAN_GE_NAMES.length).toBeGreaterThanOrEqual(12);
  });
  it('八正格齐全', () => {
    expect(MAJOR_PATTERNS.length).toBe(8);
  });
});
