// src/lib/bazi-engine/core/strength.ts
//
// 日主强弱。融合移植：
//   主：tianji analyze_day_master_strength（数值 score，day_master.py:79-130）
//   辅：bazi-calculator 三得布尔判定（bazi_calculator.py:449，格局判定消费）
// 入参：①层 BaziChart（不重算干支）。出参：StrengthResult（对齐青囊）。
//
// 算法（逐行对齐 tianji）：
//   得令：MONTH_SUPPORT[月支][日主五行]           （tianji 第1层）
//   得地：年/日/时支藏干——同五行 +0.5，生我 +0.3   （tianji 第2层，排月支）
//   得势：年/月/时干——同五行 +1.0，生我 +0.7       （tianji 第3层，排日干）

import type { BaziChart, WuXing } from '@/types/bazi';
import type { StrengthResult } from '../types';
import { GAN_WUXING } from '../knowledge/ganZhi';
import { getMonthSupport } from '../knowledge/month-support';
import { getHideGanWeight } from '../knowledge/hidden-stems';

/** 找"生我"之五行（印星方向）：土生金 → 金的生我是土。 */
function shengMeWx(wx: string): string {
  const m: Record<string, string> = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' };
  return m[wx];
}

/** 得令分（第一层：月令）。移植 tianji：查 MONTH_SUPPORT[月支][日主五行]。 */
function calcDeLing(chart: BaziChart): number {
  const dmWx = GAN_WUXING[chart.day.gan];
  return getMonthSupport(chart.month.zhi, dmWx);
}

/**
 * 得地分（第二层：通根）。
 * 移植 tianji：年/日/时支（排除月支）藏干——同五行 +权重×0.5，生我 +权重×0.3。
 * 藏干与权重均用①层 BaziChart.hideGan + knowledge 权重表查表。
 */
function calcDeDi(chart: BaziChart): number {
  const dmWx = GAN_WUXING[chart.day.gan];
  const yinWx = shengMeWx(dmWx);
  let score = 0;
  for (const pillar of [chart.year, chart.day, chart.time]) {
    for (const hideGan of pillar.hideGan) {
      const hideWx = GAN_WUXING[hideGan];
      const w = getHideGanWeight(pillar.zhi, hideGan);
      if (hideWx === dmWx) score += w * 0.5; // 同五行（比劫根）
      else if (hideWx === yinWx) score += w * 0.3; // 生我（印根）
    }
  }
  return score;
}

/**
 * 得势分（第三层：透干比劫）。
 * 移植 tianji：年/月/时干（排除日干）——同五行 +1.0，生我 +0.7。
 */
function calcDeShi(chart: BaziChart): number {
  const dmWx = GAN_WUXING[chart.day.gan];
  const yinWx = shengMeWx(dmWx);
  let score = 0;
  for (const gan of [chart.year.gan, chart.month.gan, chart.time.gan]) {
    const ganWx = GAN_WUXING[gan];
    if (ganWx === dmWx) score += 1.0; // 同五行（比劫）
    else if (ganWx === yinWx) score += 0.7; // 生我（印）
  }
  return score;
}

/**
 * score → 五档 level（对齐青囊：极弱/偏弱/中和/偏强/极强）。
 * tianji 原档：极旺/身强/中和/身弱/极弱（StrengthLevel）。
 * 映射：极旺→极强，身强→偏强，中和→中和，身弱→偏弱，极弱→极弱。
 */
function scoreToLevel(score: number): StrengthResult['level'] {
  if (score >= 6) return '极强';
  if (score >= 3) return '偏强';
  if (score >= 1) return '中和';
  if (score >= -1) return '偏弱';
  return '极弱';
}

/** 强弱入口 */
export function calculateStrength(chart: BaziChart): StrengthResult {
  const deLing = calcDeLing(chart);
  const deDi = calcDeDi(chart);
  const deShi = calcDeShi(chart);
  // 综合 score：三得之和（tianji 风格相对分）。
  // 青囊抓包的 -52 是另一套加权，我们用 tianji 相对分，方向对齐即可（spec 2.8）。
  const score = deLing + deDi + deShi;
  const dmWx = GAN_WUXING[chart.day.gan] as WuXing;
  const ratio = chart.wuXingScore[dmWx]?.ratio ?? 0;

  return {
    score: Math.round(score * 10) / 10, // 保留 1 位小数
    level: scoreToLevel(score),
    breakdown: {
      deLing: Math.round(deLing * 10) / 10,
      deDi: Math.round(deDi * 10) / 10,
      deShi: Math.round(deShi * 10) / 10,
      dongTai: 0, // MVP 置 0，变局第四层后续补（spec 2.2）
    },
    ratio,
    // 布尔三得（bazi-calculator 风格，格局判定消费）：
    deLingBool: deLing >= 2, // 月令得 ≥2 算得令
    deDiBool: deDi >= 0.5, // 通根 ≥0.5 算得地
    deShiBool: deShi >= 1.5, // 比劫 ≥1.5（约2个）算得势
  };
}
