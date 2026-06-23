// tests/lib/bazi-engine/knowledge.test.ts
import { describe, it, expect } from 'vitest';
import {
  TIAN_GAN,
  DI_ZHI,
  SHI_SHEN,
  getShiShen,
  MONTH_WANG,
  GAN_WU_HE,
  ZHI_LIU_HE,
  ZHI_CHONG,
} from '@/lib/bazi-engine/knowledge/ganZhi';
import {
  ZHI_CANG_GAN,
  ZHI_CANG_GAN_WEIGHT,
  getHideGanWeight,
} from '@/lib/bazi-engine/knowledge/hidden-stems';

describe('干支基础表', () => {
  it('十天干十二地支数量正确', () => {
    expect(TIAN_GAN.length).toBe(10);
    expect(DI_ZHI.length).toBe(12);
  });
  it('十神表应有 100 条（10 日干 × 10 他干）', () => {
    expect(Object.keys(SHI_SHEN).length).toBe(100);
  });
  it('辛日见庚应为劫财', () => {
    expect(getShiShen('辛', '庚')).toBe('劫财');
  });
  it('辛日见丙应为正官', () => {
    expect(getShiShen('辛', '丙')).toBe('正官');
  });
  it('甲日见甲应为比肩', () => {
    expect(getShiShen('甲', '甲')).toBe('比肩');
  });
  it('癸日见戊应为正官', () => {
    expect(getShiShen('癸', '戊')).toBe('正官');
  });
  it('月令当令：午月火', () => {
    expect(MONTH_WANG['午']).toBe('火');
  });
  it('丙辛合化水', () => {
    expect(GAN_WU_HE['丙,辛']).toBe('水');
  });
  it('丁壬合化木', () => {
    expect(GAN_WU_HE['丁,壬']).toBe('木');
  });
  it('子丑六合化土', () => {
    expect(ZHI_LIU_HE['子,丑']).toBe('土');
  });
  it('子冲午', () => {
    expect(ZHI_CHONG['子']).toBe('午');
    expect(ZHI_CHONG['午']).toBe('子');
  });
});

describe('藏干权重表', () => {
  it('12 地支藏干与权重都应定义且等长', () => {
    for (const zhi of DI_ZHI) {
      expect(ZHI_CANG_GAN[zhi]).toBeDefined();
      expect(ZHI_CANG_GAN_WEIGHT[zhi]).toBeDefined();
      expect(ZHI_CANG_GAN[zhi].length).toBe(ZHI_CANG_GAN_WEIGHT[zhi].length);
    }
  });
  it('丑本气己权重 0.7', () => {
    expect(getHideGanWeight('丑', '己')).toBe(0.7);
  });
  it('午本气丁权重 0.8', () => {
    expect(getHideGanWeight('午', '丁')).toBe(0.8);
  });
  it('亥本气壬权重 0.8（源码 bazi_core.py:54）', () => {
    expect(getHideGanWeight('亥', '壬')).toBe(0.8);
    expect(getHideGanWeight('亥', '甲')).toBe(0.2);
  });
  it('未本气乙权重 0.7（源码 bazi_core.py:26-39 顺序 乙/己/丁）', () => {
    expect(getHideGanWeight('未', '乙')).toBe(0.7);
    expect(getHideGanWeight('未', '己')).toBe(0.2);
    expect(getHideGanWeight('未', '丁')).toBe(0.1);
  });
  it('按名匹配权重，不依赖顺序', () => {
    // 戌源码顺序 辛/丁/戊，按名查应各自命中
    expect(getHideGanWeight('戌', '辛')).toBe(0.7);
    expect(getHideGanWeight('戌', '丁')).toBe(0.2);
    expect(getHideGanWeight('戌', '戊')).toBe(0.1);
  });
  it('未知藏干权重 0', () => {
    expect(getHideGanWeight('午', '庚')).toBe(0);
  });
});
