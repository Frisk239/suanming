// src/lib/bazi-engine/core/pattern.ts
//
// 格局判定。移植 bazi-calculator/bazi_calculator.py:562 determine_pattern +
//   bazi_calculator.py:705 _check_bian_ge。
// strength 作为前置输入（spec 2.6：身旺才取从强/专旺，身弱才取从财/从杀）。
//
// 子平取格（《渊海子平》/《子平真诠》）：
//   月令藏干透出天干 → 按十神优先级（官杀>财>印>食伤）取格
//   不透干 → 月令本气定格（子平真诠法）

import type { BaziChart } from '@/types/bazi';
import type { PatternResult, StrengthResult } from '../types';
import { getShiShen } from '../knowledge/ganZhi';
import { GE_PRIORITY, PATTERN_MAP } from '../knowledge/pattern-definitions';
import { ZHI_CANG_GAN } from '../knowledge/hidden-stems';

/**
 * 月令取格（子平真诠本气定格法）。
 *
 * 决策（用户敲定 2026-06-23）：以【月令本气】直接定格，不用 bazi-calculator 的
 * "透干优先"法。理由：青囊抓包对 辛日午月 给出"七杀格"（basis 写"月令本气丁
 * (七杀)暗藏立格"=本气定格、不论透干），而透干法会取透出的己(偏印)→偏印格，
 * 与青囊/子平真诠本气法冲突，spec 2.8"官杀类同源"不达标。
 *
 * 本气定格（《子平真诠》）：月令本气即定格局名。
 * 透干仅用于一种情况：本气为比肩/劫财时，子平不立"比肩格"，改取透出的官杀/财/印/
 * 食伤，或归建禄格/羊刃格（由 checkBianGe 处理）。
 */
function detectByMonthStem(chart: BaziChart): {
  name: string;
  transparent: boolean;
  basis: string;
} {
  const dayGan = chart.day.gan;
  const monthZhi = chart.month.zhi;
  const monthHideGans = chart.month.hideGan; // 用①层的藏干（与 knowledge 表对齐）
  const allGans = [chart.year.gan, chart.month.gan, chart.day.gan, chart.time.gan];
  const mainQi = monthHideGans[0] ?? ZHI_CANG_GAN[monthZhi]?.[0];
  const mainShiShen = mainQi ? getShiShen(dayGan, mainQi) : '';

  // 本气为比肩/劫财：子平不立比肩格，改取月支透出的非比劫十神（官杀>财>印>食伤）
  if (mainQi && (mainShiShen === '比肩' || mainShiShen === '劫财')) {
    const found: { gan: string; shiShen: string; isMain: boolean }[] = [];
    monthHideGans.forEach((g, i) => {
      if (i === 0) return; // 跳过本气（比劫）
      if (allGans.includes(g)) {
        found.push({ gan: g, shiShen: getShiShen(dayGan, g), isMain: false });
      }
    });
    if (found.length > 0) {
      found.sort((a, b) => (GE_PRIORITY[a.shiShen] ?? 99) - (GE_PRIORITY[b.shiShen] ?? 99));
      const best = found[0];
      const name = PATTERN_MAP[best.shiShen] ?? '无格';
      return {
        name,
        transparent: true,
        basis: `月支${monthZhi}本气比劫，取透干${best.gan}(${best.shiShen})立格`,
      };
    }
    // 无非比劫透干 → 本气比劫，建禄/羊刃由 checkBianGe 接管，这里兜底
    return {
      name: PATTERN_MAP[mainShiShen] ?? '比肩格',
      transparent: false,
      basis: `月令本气${mainQi}(${mainShiShen})暗藏立格`,
    };
  }

  // 本气定格（《子平真诠》主体逻辑）：本气十神即格局名
  if (mainQi) {
    const name = PATTERN_MAP[mainShiShen] ?? '无格';
    return {
      name,
      transparent: allGans.includes(mainQi),
      basis: `月令本气${mainQi}(${mainShiShen})暗藏立格`,
    };
  }
  return { name: '无格', transparent: false, basis: '月令无藏干' };
}

/**
 * 变格检测（bazi_calculator.py:705-900 _check_bian_ge）。
 * 返回变格名或 null。strength 作前置：身旺才取建禄/羊刃/从强/专旺，身弱才取从财/从杀/从儿。
 * MVP 实现核心 5 种：建禄/羊刃/从财/从杀/从儿。其余标 TODO。
 */
function checkBianGe(chart: BaziChart, strength: StrengthResult): string | null {
  const dayGan = chart.day.gan;
  const monthZhi = chart.month.zhi;
  const monthMainQi = ZHI_CANG_GAN[monthZhi]?.[0];
  const monthMainShiShen = monthMainQi ? getShiShen(dayGan, monthMainQi) : '';

  // 建禄格：月令本气为比肩（需身不弱）
  if (monthMainShiShen === '比肩' && (strength.deShiBool || strength.deLingBool)) {
    return '建禄格';
  }
  // 羊刃格：月令本气为劫财（需身不弱）
  if (monthMainShiShen === '劫财' && (strength.deShiBool || strength.deLingBool)) {
    return '羊刃格';
  }

  // 从格（需身弱/极弱）：从财/从杀/从儿
  if (strength.level === '偏弱' || strength.level === '极弱') {
    const allHideGans: string[] = [];
    [chart.year, chart.month, chart.day, chart.time].forEach((p) => allHideGans.push(...p.hideGan));
    const caiCount = allHideGans.filter((g) => ['正财', '偏财'].includes(getShiShen(dayGan, g))).length;
    const guanCount = allHideGans.filter((g) => ['正官', '七杀'].includes(getShiShen(dayGan, g))).length;
    const shiCount = allHideGans.filter((g) => ['食神', '伤官'].includes(getShiShen(dayGan, g))).length;
    // MVP 简化阈值：同类十神 ≥4 主导
    if (caiCount >= 4) return '从财格';
    if (guanCount >= 4) return '从杀格';
    if (shiCount >= 4) return '从儿格';
  }

  // 专旺格（需身强/极强）：MVP 暂不深判，标 null 走正格
  // 专旺/化气/两神成象等后续补

  return null;
}

/** 格局入口 */
export function determinePattern(chart: BaziChart, strength: StrengthResult): PatternResult {
  // 先查变格（变格优先，bazi_calculator.py:657-678）
  const bianGe = checkBianGe(chart, strength);
  if (bianGe) {
    return {
      name: bianGe,
      type: '变格',
      basis: `${bianGe}：${strength.level}条件满足`,
      transparent: false,
      success: true,
      pure: true,
    };
  }
  // 正格
  const detected = detectByMonthStem(chart);
  // 成败/清浊 MVP 简化：先都标 true，后续补 _eval_pattern_success
  return {
    name: detected.name,
    type: '正格',
    basis: detected.basis,
    transparent: detected.transparent,
    success: true,
    pure: true,
  };
}
