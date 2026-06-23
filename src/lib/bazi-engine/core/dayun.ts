// src/lib/bazi-engine/core/dayun.ts
//
// 大运吉凶评估。移植 suangua/core/bazi/forecaster.py:134 _assess_quality（吉凶平 tier）+
// 自加 score 计算（spec 2.6：tier 基础分 + 用神契合度）。
//
// ⚠️ 关键设计（计划 Task7 修正）：tier 由【用神关系】决定，而非单纯身强弱。
//   suangua 原始 _assess_quality 用身强弱逻辑（身弱→印比为吉），但青囊的 dayun
//   吉凶以【用神】为核心——七杀格喜印化（用神=印），官杀生印方向的大运判 good。
//   若只用身强弱逻辑，案例"身弱+丙火官杀"会被判凶，与青囊（丙戌 good）矛盾。
//   故 tier 主判用用神关系，身强弱仅作辅助（MVP 不引入辅助微调，保持简洁）。

import type { BaziChart, WuXing } from '@/types/bazi';
import type { DayunAssessment, YongshenResult } from '../types';
import { GAN_WUXING, ZHI_CHONG } from '../knowledge/ganZhi';

/**
 * tier 判定（以用神关系为核心，对齐青囊逻辑）。
 *   大运天干五行 == 用神 → good
 *   大运天干五行 ∈ 喜神 → good（生用神/同用神）
 *   大运天干五行 ∈ 忌神 → bad（克用神/用神所克）
 *   否则（闲神）→ neutral
 */
function assessTier(
  dyGanWx: string,
  yongshen: YongshenResult,
): 'good' | 'neutral' | 'bad' {
  if (yongshen.primary === dyGanWx) return 'good';
  if (yongshen.favor.includes(dyGanWx as WuXing)) return 'good';
  if (yongshen.avoid.includes(dyGanWx as WuXing)) return 'bad';
  return 'neutral';
}

/** score 计算（spec 2.6：tier 基础分 + 用神契合度调整） */
function calcScore(
  tier: 'good' | 'neutral' | 'bad',
  dyGanWx: string,
  yongshen: YongshenResult,
): number {
  const base = tier === 'good' ? 20 : tier === 'neutral' ? 0 : -20;
  let adj = 0;
  if (yongshen.primary === dyGanWx) adj += 15;
  if (yongshen.favor.includes(dyGanWx as WuXing)) adj += 8;
  if (yongshen.avoid.includes(dyGanWx as WuXing)) adj -= 12;
  return base + adj;
}

/** 大运吉凶入口 */
export function assessDayuns(
  chart: BaziChart,
  yongshen: YongshenResult,
  _strength: { level: string },
): DayunAssessment[] {
  return chart.daYun.map((dy) => {
    const dyGanWx = GAN_WUXING[dy.ganZhi[0]];
    const tier = assessTier(dyGanWx, yongshen);
    const score = calcScore(tier, dyGanWx, yongshen);
    // 引动原局的冲合刑害事件：MVP 只查地支冲
    const dyZhi = dy.ganZhi[1];
    const events: string[] = [];
    const pillarNames = ['年', '月', '日', '时'] as const;
    const pillars = [chart.year, chart.month, chart.day, chart.time];
    pillars.forEach((p, i) => {
      if (ZHI_CHONG[dyZhi] === p.zhi) {
        events.push(`大运${dyZhi}冲${pillarNames[i]}支${p.zhi}`);
      }
    });
    return {
      ganZhi: dy.ganZhi,
      startAge: dy.startAge,
      endAge: dy.endAge,
      startYear: dy.startYear,
      endYear: dy.endYear,
      assessment: { score, tier },
      events,
    };
  });
}
