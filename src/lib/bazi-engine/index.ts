// src/lib/bazi-engine/index.ts
// ②层规则引擎对外出口（spec 2.7）。

export { analyzeBazi } from './core/analyze';
export type {
  StrengthResult,
  PatternResult,
  YongshenResult,
  DayunAssessment,
  BaziAnalysisResult,
} from './types';
