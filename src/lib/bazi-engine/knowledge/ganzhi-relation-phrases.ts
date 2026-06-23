// src/lib/bazi-engine/knowledge/ganzhi-relation-phrases.ts
//
// 干支关系中文描述表，narrative-seed 用。
// 把天干合/地支六合/地支冲/干支健康气势翻译成中文句，模板参照青囊抓包叙事种子
// （docs/qingnang-analysis.md 附录）。

import { GAN_WU_HE, ZHI_LIU_HE, ZHI_CHONG, GAN_WUXING, WUXING_SHENG, WUXING_KE } from './ganZhi';

/** 天干合的中文描述（如 丙合辛 → "天干丙合日干辛（合化水）"） */
export function phraseGanHe(ganA: string, ganB: string, bIsDayGan: boolean): string | null {
  const hua = GAN_WU_HE[`${ganA},${ganB}`];
  if (!hua) return null;
  const bLabel = bIsDayGan ? '日干' : '干';
  return `引动原局：天干${ganA}合${bLabel}${ganB}（合化${hua}）`;
}

/** 地支六合的中文描述 */
export function phraseZhiHe(zhiA: string, zhiB: string, pillarLabel: string): string | null {
  const hua = ZHI_LIU_HE[`${zhiA},${zhiB}`];
  if (!hua) return null;
  return `引动原局：地支${zhiA}合${pillarLabel}支${zhiB}（六合化${hua}）`;
}

/** 地支冲的中文描述 */
export function phraseZhiChong(zhiA: string, zhiB: string, pillarLabel: string): string | null {
  if (ZHI_CHONG[zhiA] !== zhiB) return null;
  return `引动原局：地支${zhiA}冲${pillarLabel}支${zhiB}（${zhiA}${zhiB}相冲）`;
}

/**
 * 干支健康气势句（对齐青囊"丙戌干支相生，天覆地载，气势贯通"）。
 * 比较本柱天干五行 vs 地支本气五行：相生=气势贯通，相克=盖头/截脚。
 */
export function phraseGanZhiHealth(gan: string, zhi: string): string {
  const ganWx = GAN_WUXING[gan];
  // 地支本气五行：用 ZHI_WUXING（本气）
  const zhiWx = ({ 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' } as Record<string, string>)[zhi];
  if (!ganWx || !zhiWx) return '';
  if (ganWx === zhiWx) return `${gan}${zhi}干支同气，根基稳固`;
  if (WUXING_SHENG[ganWx] === zhiWx) return `${gan}${zhi}干支相生，天覆地载，气势贯通`;
  if (WUXING_SHENG[zhiWx] === ganWx) return `${gan}${zhi}干支相生，地气上承`;
  if (WUXING_KE[ganWx] === zhiWx) return `${gan}${zhi}干支相克（盖头），气势受阻`;
  if (WUXING_KE[zhiWx] === ganWx) return `${gan}${zhi}干支相克（截脚），根气受损`;
  return `${gan}${zhi}干支组合`;
}
