// src/lib/bazi-engine/knowledge/hidden-stems.ts
//
// 藏干表 + 权重表。移植自 bazi-calculator/bazi_core.py:26-55。
// ⚠️ 注意：本表 ZHI_CANG_GAN 顺序与 bazi-core(tyme4ts) 可能不同，
//    以①层 BaziChart.hideGan 为准——②层算强弱用①层藏干 + 本表权重查表，
//    不重算藏干。本表 ZHI_CANG_GAN 主要用于：①权重按藏干名匹配；②pattern 判定取本气 [0]。

/** 藏干表（bazi_core.py:26-39，《渊海子平》顺序）。 */
export const ZHI_CANG_GAN: Record<string, string[]> = {
  子: ['癸'],
  丑: ['己', '癸', '辛'],
  寅: ['甲', '丙', '戊'],
  卯: ['乙'],
  辰: ['戊', '乙', '癸'],
  巳: ['丙', '庚', '戊'],
  午: ['丁', '己'],
  未: ['乙', '己', '丁'],
  申: ['庚', '壬', '戊'],
  酉: ['辛'],
  戌: ['辛', '丁', '戊'],
  亥: ['壬', '甲'],
};

/** 藏干权重（bazi_core.py:42-55）。本气/中气/余气，与 ZHI_CANG_GAN 顺序对应。
 *  如 丑:[0.7,0.2,0.1] 表示 己0.7/癸0.2/辛0.1。 */
export const ZHI_CANG_GAN_WEIGHT: Record<string, number[]> = {
  子: [1.0],
  丑: [0.7, 0.2, 0.1],
  寅: [0.7, 0.2, 0.1],
  卯: [1.0],
  辰: [0.7, 0.2, 0.1],
  巳: [0.7, 0.2, 0.1],
  午: [0.8, 0.2],
  未: [0.7, 0.2, 0.1],
  申: [0.7, 0.2, 0.1],
  酉: [1.0],
  戌: [0.7, 0.2, 0.1],
  亥: [0.8, 0.2],
};

/**
 * 取某地支某藏干的权重（按藏干名匹配；若①层藏干顺序与本表不同，仍能按名命中正确权重）。
 * 找不到返回 0。
 */
export function getHideGanWeight(zhi: string, hideGan: string): number {
  const gans = ZHI_CANG_GAN[zhi] ?? [];
  const weights = ZHI_CANG_GAN_WEIGHT[zhi] ?? [];
  const idx = gans.indexOf(hideGan);
  return idx >= 0 ? weights[idx] ?? 0 : 0;
}
