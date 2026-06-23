// src/lib/bazi-engine/core/yongshen.ts
//
// 用神选取。移植 bazi-calculator/bazi_calculator.py:960 select_yong_shen
// （四法融合 + 17 格局修正）。调候数据来自 suangua/knowledge/bazi_classical.py TIAO_HOU_TABLE。
//
// 四法优先级：病药 > 调候 > 通关 > 扶抑（扶抑兜底）。
// MVP 取舍：病药/通关 简化（返回空），调候+扶扬是主力；七杀格的"印化"修正实现。
// 其余 16 格局修正逐步补（spec 2.2/2.6）。

import type { BaziChart, WuXing } from '@/types/bazi';
import type { YongshenResult, StrengthResult, PatternResult } from '../types';
import { GAN_WUXING, WUXING_SHENG, WUXING_KE } from '../knowledge/ganZhi';
import { getTiaohouWuxing } from '../knowledge/tiaohou-table';

const ALL_WX: WuXing[] = ['金', '木', '水', '火', '土'];

/** 找"生我"之五行（印）：土生金 → 金的生我是土。 */
function shengMeWx(wx: WuXing): WuXing {
  const m: Record<string, WuXing> = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' };
  return m[wx];
}

/** 找"克我"之五行（官杀）：金克木 → 木的克我是金。 */
function keMeWx(wx: WuXing): WuXing {
  const m: Record<string, WuXing> = { 木: '金', 火: '水', 土: '木', 金: '火', 水: '土' };
  return m[wx];
}

/**
 * 扶抑法（bazi_calculator.py:1093 _select_by_fuyi）：
 * 身弱 → 生我(印) + 同我(比劫)；身强 → 克我(官杀) + 我生(食伤) + 我克(财)。
 */
function selectByFuyi(strength: StrengthResult, dmWx: WuXing): WuXing[] {
  const shengMe = shengMeWx(dmWx); // 印
  const same = dmWx; // 比劫
  const iSheng = WUXING_SHENG[dmWx] as WuXing; // 食伤
  const keMe = keMeWx(dmWx); // 官杀
  const iKe = WUXING_KE[dmWx] as WuXing; // 财
  if (strength.level === '偏弱' || strength.level === '极弱') {
    return [shengMe, same]; // 身弱用印比
  }
  if (strength.level === '偏强' || strength.level === '极强') {
    return [keMe, iSheng, iKe]; // 身强用官食财
  }
  return [same]; // 中和：比劫调
}

/** 调候法（bazi_calculator.py:1133 _select_by_tiaohou）：查穷通宝鉴 TIAO_HOU_TABLE[日干][月支]。 */
function selectByTiaohou(chart: BaziChart): WuXing[] {
  const wx = getTiaohouWuxing(chart.day.gan, chart.month.zhi);
  return wx ? [wx as WuXing] : [];
}

/**
 * 通关法（bazi_calculator.py:1148 _select_by_tongguan）：
 * 两神相战（如水火）→ 用通关之神（木）。
 * MVP 简化：暂返回空，标 TODO。完整实现需检测原局对立五行对。
 */
function selectByTongguan(_chart: BaziChart): WuXing[] {
  return [];
}

/**
 * 病药法（bazi_calculator.py:1105 _select_by_bingyao）：
 * MVP 简化：暂返回空，标 TODO。完整版需识别"官杀混杂/比劫重重/食伤太过"。
 */
function selectByBingyao(_chart: BaziChart, _strength: StrengthResult): WuXing[] {
  return [];
}

/** 用神入口（四法融合 + 格局修正） */
export function selectYongshen(
  chart: BaziChart,
  strength: StrengthResult,
  pattern: PatternResult,
): YongshenResult {
  const dmWx = GAN_WUXING[chart.day.gan] as WuXing;

  // 四法融合（bazi-calculator 优先级：病药 > 调候 > 通关 > 扶抑，扶抑兜底）
  const bingyao = selectByBingyao(chart, strength);
  const tiaohou = selectByTiaohou(chart);
  const tongguan = selectByTongguan(chart);
  const fuyi = selectByFuyi(strength, dmWx);

  let primaryList: WuXing[] = [];
  let method: YongshenResult['method'] = '扶抑';
  if (bingyao.length > 0) {
    primaryList = bingyao;
    method = '病药';
  } else if (tiaohou.length > 0) {
    primaryList = tiaohou;
    method = '调候';
  } else if (tongguan.length > 0) {
    primaryList = tongguan;
    method = '通关';
  } else {
    primaryList = fuyi;
    method = '扶抑';
  }

  // 格局修正（bazi_calculator.py:1020-1075，17 格局名特判）
  // MVP：七杀格优先印化（杀印相生）——印=生我之五行
  if (pattern.name === '七杀格') {
    const yin = shengMeWx(dmWx);
    if (!primaryList.includes(yin)) primaryList.unshift(yin);
    method = '格局';
  }

  const primary = primaryList[0] ?? dmWx;
  // 喜神 = 生用神之五行 + 同用神
  const favor = [shengMeWx(primary), primary];
  // 忌神 = 克用神之五行 + 用神所克
  const avoid = [keMeWx(primary), WUXING_KE[primary] as WuXing];
  // 闲神 = 既非用喜忌
  const used = new Set<WuXing>([primary, ...favor, ...avoid]);
  const xian = ALL_WX.filter((w) => !used.has(w));

  return {
    primary,
    favor: Array.from(new Set(favor)),
    avoid: Array.from(new Set(avoid)),
    xian,
    method,
    advice: `${method}取用：日主${dmWx}${strength.level}，用神${primary}`,
  };
}
