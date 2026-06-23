// src/lib/bazi-engine/core/narrative-seed.ts
//
// 叙事种子生成（青囊独有，开源项目都没有，自写）。
// 把②层结构化结果翻译成 LLM 能直接用的半成品文案片段。
// 模板参照青囊抓包 narrativeSeed（docs/qingnang-analysis.md 附录）：
//   - tier 基调句（顺应善神 / 冲犯忌神 / 闲神流转）
//   - 干支 vs 用神定性句（天干丙属喜神）
//   - 干支健康气势句（丙戌干支相生...）
//   - 引动原局句（天干丙合日干辛 / 地支冲合）

import type { BaziChart, WuXing } from '@/types/bazi';
import type { DayunAssessment, YongshenResult, PatternResult } from '../types';
import { GAN_WUXING } from '../knowledge/ganZhi';
import { phraseGanHe, phraseZhiHe, phraseZhiChong, phraseGanZhiHealth } from '../knowledge/ganzhi-relation-phrases';

/** tier → 基调句（对齐青囊"顺应善神..."模板） */
function tierSeed(tier: DayunAssessment['assessment']['tier']): string {
  if (tier === 'good') return '顺应善神：流年五行生助原局顺用之善神。';
  if (tier === 'bad') return '冲犯忌神：流年五行克损原局，需防反复。';
  return '闲神流转：流年五行中性，平顺过渡。';
}

/** 干支 vs 用神定性句 */
function roleSeed(dyGan: string, yongshen: YongshenResult): string {
  const wx = GAN_WUXING[dyGan];
  if (yongshen.primary === wx) return `天干${dyGan}(${wx})属用神，为顺用之核心。`;
  if (yongshen.favor.includes(wx as WuXing)) return `天干${dyGan}(${wx})属喜神，生扶用神。`;
  if (yongshen.avoid.includes(wx as WuXing)) return `天干${dyGan}(${wx})属忌神，逆用需防。`;
  return `天干${dyGan}(${wx})属闲神，作用平平。`;
}

/** 引动原局句（查大运干支与四柱的冲合） */
function eventSeeds(dy: DayunAssessment, chart: BaziChart): string[] {
  const seeds: string[] = [];
  const dyGan = dy.ganZhi[0];
  const dyZhi = dy.ganZhi[1];
  const pillars = [chart.year, chart.month, chart.day, chart.time];
  const labels = ['年', '月', '日', '时'] as const;
  pillars.forEach((p, i) => {
    // 天干合（大运干 合 四柱干；日柱标"日干"）
    const he = phraseGanHe(dyGan, p.gan, i === 2);
    if (he) seeds.push(he);
    // 地支六合（双向）
    const zhiHe = phraseZhiHe(dyZhi, p.zhi, labels[i]);
    if (zhiHe) seeds.push(zhiHe);
    // 地支冲
    const chong = phraseZhiChong(dyZhi, p.zhi, labels[i]);
    if (chong) seeds.push(chong);
  });
  return seeds;
}

/** 叙事种子入口 */
export function generateNarrativeSeeds(
  dayun: DayunAssessment,
  yongshen: YongshenResult,
  _pattern: PatternResult,
  chart: BaziChart,
): string[] {
  const seeds: string[] = [];
  seeds.push(tierSeed(dayun.assessment.tier));
  seeds.push(roleSeed(dayun.ganZhi[0], yongshen));
  const health = phraseGanZhiHealth(dayun.ganZhi[0], dayun.ganZhi[1]);
  if (health) seeds.push(health);
  seeds.push(...eventSeeds(dayun, chart));
  return seeds.filter((s) => s && s.length > 0);
}
