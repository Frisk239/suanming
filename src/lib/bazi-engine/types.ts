// src/lib/bazi-engine/types.ts
//
// ②层规则引擎的结果类型定义。对齐 spec 第 2.6 节 + 青囊抓包字段（docs/qingnang-analysis.md 附录）。
// ②层全部消费①层的 BaziChart（import @/types/bazi），不重算干支。

import type { BaziChart, WuXing } from '@/types/bazi';

/**
 * 日主强弱结果（对齐青囊 strength）。
 * 青囊抓包：{ score:-52, level:"偏弱", breakdown:{deLing:-26,deDi:-30,deShi:4,dongTai:0} }
 */
export interface StrengthResult {
  /** 综合分（tianji 数值算法相对分，方向对齐青囊即可，spec 2.8） */
  score: number;
  /** 五档：极弱/偏弱/中和/偏强/极强（对齐青囊 level） */
  level: '极弱' | '偏弱' | '中和' | '偏强' | '极强';
  breakdown: {
    /** 得令分（月令，第一层） */
    deLing: number;
    /** 得地分（通根，第二层） */
    deDi: number;
    /** 得势分（透干比劫，第三层） */
    deShi: number;
    /** 动态分（变局，第四层；MVP 置 0，已知缺口，spec 2.2） */
    dongTai: number;
  };
  /** 日主五行占比（来自①层 wuXingScore） */
  ratio: number;
  /** 布尔三得（bazi-calculator 风格，格局判定消费，spec 2.6） */
  deLingBool: boolean;
  deDiBool: boolean;
  deShiBool: boolean;
}

/**
 * 格局结果（对齐青囊 ge）。
 * 青囊抓包：{ name:"七杀格", basis:"月令本气丁(七杀)暗藏立格" }
 */
export interface PatternResult {
  /** 格局名，如 "七杀格"（青囊 ge.name） */
  name: string;
  /** 正格 / 变格 */
  type: '正格' | '变格';
  /** 立格依据 */
  basis: string;
  /** 是否透干 */
  transparent: boolean;
  /** 成格 / 破格（MVP 暂都置 true，后续补 _eval_pattern_success） */
  success: boolean;
  /** 清 / 浊（MVP 暂都置 true） */
  pure: boolean;
}

/**
 * 用神喜忌结果（对齐青囊 yj）。
 * 青囊抓包：{ primary:"土", favor:["土","金","水"], avoid:["木","火"] }
 */
export interface YongshenResult {
  /** 用神（青囊 yj.primary） */
  primary: WuXing;
  /** 喜神 */
  favor: WuXing[];
  /** 忌神 */
  avoid: WuXing[];
  /** 闲神（既非用喜忌，MVP 自算；bazi-calculator 无此字段，spec 2.6 注明要自己算） */
  xian: WuXing[];
  /** MVP 单引擎取用主法（dualEngine 后续扩展，spec 2.2） */
  method: '扶抑' | '病药' | '调候' | '通关' | '格局';
  /** 取用说明 */
  advice: string;
}

/**
 * 大运吉凶评估（对齐青囊 daYuns[].assessment）。
 * 青囊抓包：{ ganZhi:"丙戌", assessment:{score:34,tier:"good"}, narrativeSeed:[...] }
 */
export interface DayunAssessment {
  ganZhi: string;
  startAge: number;
  endAge: number;
  startYear: number;
  endYear: number;
  assessment: {
    /** 数值分（tier 基础分 + 用神契合度，spec 2.6） */
    score: number;
    /** 吉凶档（suangua _assess_quality 的吉/凶/平映射） */
    tier: 'good' | 'neutral' | 'bad';
  };
  /** 引动原局的冲合刑害事件（来自①层四柱） */
  events: string[];
}

/**
 * 聚合结果（对齐青囊解读 JSON 的 mingju 容器，MVP 只装四大件，spec 2.2/2.7）。
 */
export interface BaziAnalysisResult {
  strength: StrengthResult;
  pattern: PatternResult;
  yongshen: YongshenResult;
  /** 每步大运 + 叙事种子 */
  daYuns: (DayunAssessment & { narrativeSeed: string[] })[];
}

/** ②层聚合入口签名 */
export type AnalyzeBazi = (chart: BaziChart) => BaziAnalysisResult;
