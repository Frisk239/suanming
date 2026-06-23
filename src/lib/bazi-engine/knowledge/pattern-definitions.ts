// src/lib/bazi-engine/knowledge/pattern-definitions.ts
//
// 格局定义表。移植自 bazi-calculator/bazi_calculator.py:601-643（priority + pattern_map）+
// bazi_calculator.py:705-900（_check_bian_ge 检查的变格名）。
// suangua core/constants.py:354 的八正格名（MAJOR_PATTERNS）作为补充。

/**
 * 月令透干取格优先级（bazi_calculator.py:601-608）。
 * 官杀(1) > 财(2) > 印(3) > 食伤(4)，同级本气优先。
 */
export const GE_PRIORITY: Record<string, number> = {
  七杀: 1, 正官: 1,
  偏财: 2, 正财: 2,
  偏印: 3, 正印: 3,
  伤官: 4, 食神: 4,
};

/** 十神 → 格局名映射（bazi_calculator.py:637-643 pattern_map） */
export const PATTERN_MAP: Record<string, string> = {
  正官: '正官格', 七杀: '七杀格',
  正财: '正财格', 偏财: '偏财格',
  正印: '正印格', 偏印: '偏印格',
  食神: '食神格', 伤官: '伤官格',
  比肩: '比肩格', 劫财: '劫财格',
};

/**
 * 变格名清单（bazi_calculator.py:705-900 _check_bian_ge 检查顺序）。
 * MVP 实现其中 5 种核心（建禄/羊刃/从财/从杀/从儿），其余作清单备查。
 */
export const BIAN_GE_NAMES = [
  '建禄格', '羊刃格', '两神成象格', '从强格', '从财格', '从杀格', '从儿格',
  '专禄格', '专旺格', '化气格', '从势格', '身旺无制格',
] as const;

/** 八正格名（suangua core/constants.py:354 MAJOR_PATTERNS） */
export const MAJOR_PATTERNS = [
  '正官格', '七杀格', '正印格', '偏印格', '正财格', '偏财格', '食神格', '伤官格',
] as const;
