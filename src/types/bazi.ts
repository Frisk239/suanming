// src/types/bazi.ts
// 排盘相关类型定义（前后端共享）。对齐 spec 第 3.1 节。
// 字段命名：英文 key + 中文枚举值（对齐青囊抓包）。

/** 五行 */
export type WuXing = '金' | '木' | '水' | '火' | '土';

/** 排盘入参（①层 API 输入） */
export interface ChartInput {
  /** 称谓（可选） */
  name?: string;
  gender: 'male' | 'female';
  /** 公历 "1990-06-15 22:37"（YYYY-MM-DD HH:mm） */
  solarDate: string;
  /** 原始输入是否农历（UI 回显用；存档统一转公历） */
  isLunar?: boolean;
  /** 城市名（查经纬度，优先用） */
  city?: string;
  /** 或直接给经度（与 city 二选一） */
  longitude?: number;
  latitude?: number;
  /** 真太阳时，默认 true */
  useTrueSolar?: boolean;
  /** 子时分日流派，默认 1（早子时算明天） */
  sect?: 1 | 2;
}

/** 单柱（年/月/日/时柱通用结构） */
export interface Pillar {
  gan: string; // 天干 "庚"
  zhi: string; // 地支 "午"
  ganZhi: string; // 干支 "庚午"
  wuXing: string; // 五行 "金火"
  naYin: string; // 纳音 "路旁土"
  hideGan: string[]; // 藏干 ["丁","己"]
  shiShenGan: string; // 天干十神 "劫财"（日柱固定为"日主"）
  shiShenZhi: string[]; // 地支藏干十神 ["七杀","偏印"]
  diShi: string; // 星运（日主对地支十二长生）"病"
  ziZuo: string; // 自坐（本柱天干对地支十二长生）"沐浴"
  shenSha: string[]; // 神煞
  kongWang: string; // 空亡（如"戌亥"，单值）
}

/** 大运干支（原始，无吉凶——吉凶是②层的事） */
export interface DaYunRaw {
  ganZhi: string; // "癸未"
  startAge: number;
  endAge: number;
  startYear: number;
  endYear: number;
}

/** 排盘结果（①层输出 = ②层输入） */
export interface BaziChart {
  solarDate: string; // 公历（回显）
  trueSolarTime: string; // 真太阳时
  lunarDate: string; // 农历
  gender: 'male' | 'female';
  city: string;
  longitude: number;

  year: Pillar;
  month: Pillar;
  day: Pillar;
  time: Pillar;

  mingGong: string; // 命宫
  shenGong: string; // 身宫
  taiYuan: string; // 胎元

  /** 五行明面计数（四柱天干地支）；M1 可置空，②层会自行统计 */
  wuXingCount: Record<WuXing, number>;
  /** 五行含藏干计数（②层强弱判定用）；M1 可置空，②层会自行统计 */
  wuXingHidden: Record<WuXing, number>;
  /** 五行加权分值（bazi-core 提供，占比 ratio 已 parse 为 0-1 小数） */
  wuXingScore: Record<WuXing, { score: number; ratio: number }>;
  /** 日主五行 */
  dayMasterWuXing: WuXing;

  yunDirection: '顺行' | '逆行';
  yunStartAge: number; // 起运虚岁（从大运第一步解析）
  daYun: DaYunRaw[];

  jieQi: string; // 节气（M1 从农历/公历串暂取空，②层补充）
  daysSinceJie: number;
}
