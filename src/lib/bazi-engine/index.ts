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

/**
 * 当前引擎版本（M7 快照失效控制，spec 4.3）。
 * ②层引擎升级时（如补从格、调候增强）递增此版本号，
 * 旧快照 engine_version 不匹配 → 用户重排时自动重算（无感）。
 */
export const ENGINE_VERSION = 'm7-ask';
