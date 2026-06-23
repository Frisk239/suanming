// src/lib/bazi-engine/core/analyze.ts
//
// ②层聚合入口：chart → strength → pattern → yongshen → dayuns → narrativeSeed
// 唯一编排点，串起五个模块（spec 2.7）。②层纯内存计算，不碰 IO/Supabase。

import type { BaziChart } from '@/types/bazi';
import type { BaziAnalysisResult } from '../types';
import { calculateStrength } from './strength';
import { determinePattern } from './pattern';
import { selectYongshen } from './yongshen';
import { assessDayuns } from './dayun';
import { generateNarrativeSeeds } from './narrative-seed';

export function analyzeBazi(chart: BaziChart): BaziAnalysisResult {
  const strength = calculateStrength(chart);
  const pattern = determinePattern(chart, strength);
  const yongshen = selectYongshen(chart, strength, pattern);
  const dayuns = assessDayuns(chart, yongshen, strength);
  const dayunsWithSeed = dayuns.map((d) => ({
    ...d,
    narrativeSeed: generateNarrativeSeeds(d, yongshen, pattern, chart),
  }));
  return { strength, pattern, yongshen, daYuns: dayunsWithSeed };
}
