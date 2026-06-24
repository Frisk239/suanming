// src/lib/bazi/bazi-core-adapter.ts
//
// ①层排盘适配层：把 shunshi-bazi-core 的输出转成我们的 BaziChart 类型。
//
// ⚠️ 这是全项目【唯一】允许 import shunshi-bazi-core 的地方。
// 其它代码只调 adaptBaziCore，绝不直接 import shunshi-bazi-core——
// 这样 bazi-core 升级或换库时只改这一个文件（spec 1.2/3.1）。
//
// 字段映射依据 Task 2 Step 3 的实测契约（见 commit 6282622）。
// 实测：getBaziChart 输出嵌套，真正排盘数据在 result.八字 下；
//       所有 key 为中文；日柱主星实测为"元男"（日干十神别名），需转"日主"。

import { getBaziChart } from 'shunshi-bazi-core';
import type {
  BaziChart,
  ChartInput,
  DaYunRaw,
  Pillar,
  WuXing,
} from '@/types/bazi';

/** bazi-core 的入参（见 dist/index.d.ts GetBaziChartInput） */
interface BaziCoreInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  gender: 0 | 1;
  city?: string;
  longitude?: number;
  latitude?: number;
  useTrueSolarTime?: boolean;
  sect?: 1 | 2;
}

/**
 * 把我们的 ChartInput 转成 bazi-core 的入参。
 * bazi-core 用 gender: 0=female 1=male；时间用分立字段。
 */
function toCoreInput(input: ChartInput): BaziCoreInput {
  const [datePart, timePart] = input.solarDate.split(' ');
  const [y, m, d] = datePart.split('-').map(Number);
  const [hour, minute] = (timePart ?? '0:0').split(':').map(Number);
  return {
    year: y,
    month: m,
    day: d,
    hour,
    minute,
    gender: input.gender === 'male' ? 1 : 0,
    city: input.city,
    longitude: input.longitude,
    latitude: input.latitude,
    useTrueSolarTime: input.useTrueSolar ?? true,
    sect: input.sect ?? 1,
  };
}

function emptyWuXingRecord(): Record<WuXing, number> {
  return { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 };
}

/**
 * 占比字符串 → 0-1 小数（实测"20%"格式）。
 */

/**
 * 把占比字符串（如"20%"）解析成 0-1 小数。无法解析返回 0。
 */
function parseRatio(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (typeof raw !== 'string') return 0;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n / 100 : 0;
}

/**
 * 映射 bazi-core 单柱 → 我们的 Pillar。
 * 实测源字段：干支/天干/地支/纳音/五行/主星/副星/藏干/星运/自坐/空亡/神煞。
 * 日柱的"主星"实测为"元男"（日干十神别名），统一改成"日主"。
 */
function mapPillar(raw: any, isDayPillar: boolean): Pillar {
  const shiShenGan = isDayPillar ? '日主' : raw.主星 ?? '';
  return {
    gan: raw.天干 ?? '',
    zhi: raw.地支 ?? '',
    ganZhi: raw.干支 ?? '',
    wuXing: raw.五行 ?? '',
    naYin: raw.纳音 ?? '',
    hideGan: raw.藏干 ?? [],
    shiShenGan,
    shiShenZhi: raw.副星 ?? [],
    diShi: raw.星运 ?? '',
    ziZuo: raw.自坐 ?? '',
    shenSha: raw.神煞 ?? [],
    kongWang: raw.空亡 ?? '',
  };
}

/**
 * 大运顺逆方向：子平铁律——阳男阴女顺行，阴男阳女逆行。
 * （年柱天干阴阳 × 性别）
 *   - 阳干（甲丙戊庚壬）：男顺行 / 女逆行
 *   - 阴干（乙丁己辛癸）：男逆行 / 女顺行
 */
const YANG_GAN = new Set(['甲', '丙', '戊', '庚', '壬']);

function inferYunDirection(yearGan: string, gender: 'male' | 'female'): '顺行' | '逆行' {
  const yearIsYang = YANG_GAN.has(yearGan);
  // 阳男/阴女 顺行；阴男/阳女 逆行
  const shun = yearIsYang ? gender === 'male' : gender === 'female';
  return shun ? '顺行' : '逆行';
}

/** ①层排盘适配入口（全项目唯一接触 bazi-core 的函数）。 */
export function adaptBaziCore(input: ChartInput): BaziChart {
  // bazi-core 的 cityCache 只覆盖约 90 个城市，用户输入的城市（如「漳州」）
  // 可能不在其中 → 抛 "City not in cache"。兜底：捕获后回退成不校正真太阳时
  // （用标准时区时间），真太阳时偏差最多几分钟，对排盘影响极小（除非卡时辰边界）。
  let output: any;
  try {
    output = getBaziChart(toCoreInput(input));
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (/not in.*cache|city/i.test(msg) && input.longitude == null) {
      // 城市查不到且无经纬度：回退不校正真太阳时重试
      output = getBaziChart(toCoreInput({ ...input, city: undefined, useTrueSolar: false }));
    } else {
      throw e;
    }
  }
  // 真正的排盘数据在 output.八字
  const core = (output as any).八字 as any;
  const trueSolar = (output as any).真太阳时 as any;

  const pillars = core.柱位详细 ?? {};
  const year = mapPillar(pillars.年柱, false);
  const month = mapPillar(pillars.月柱, false);
  const day = mapPillar(pillars.日柱, true);
  const time = mapPillar(pillars.时柱, false);

  // 五行分值（实测输出 金/木/水/火/土 各含 { 分值, 占比字符串 }）
  const rawScore = core.五行分值 ?? {};
  const wuXingScore = {
    金: scoreEntry(rawScore.金),
    木: scoreEntry(rawScore.木),
    水: scoreEntry(rawScore.水),
    火: scoreEntry(rawScore.火),
    土: scoreEntry(rawScore.土),
  };

  // 大运干支（原始，无吉凶）
  const rawDaYun: any[] = core.大运 ?? [];
  const daYun: DaYunRaw[] = rawDaYun.map((d) => ({
    ganZhi: d.干支 ?? '',
    startAge: d.起始年龄 ?? 0,
    endAge: d.结束年龄 ?? 0,
    startYear: d.起始年份 ?? 0,
    endYear: d.结束年份 ?? 0,
  }));

  // 起运虚岁：从大运第一步的起始年龄取（实测可靠，比起运字符串解析稳）
  const yunStartAge = daYun.length > 0 ? daYun[0].startAge : 0;
  // 顺逆方向：子平铁律（年干阴阳 × 性别）
  const yunDirection = inferYunDirection(year.gan, input.gender);

  return {
    solarDate: input.solarDate,
    trueSolarTime: trueSolar?.真太阳时 ?? '',
    lunarDate: core.农历 ?? '',
    gender: input.gender,
    city: input.city ?? '',
    longitude: input.longitude ?? 0,
    year,
    month,
    day,
    time,
    mingGong: core.命宫 ?? '',
    shenGong: core.身宫 ?? '',
    taiYuan: core.胎元 ?? '',
    // 明面/含藏干计数：M1 置空，②层自行统计（spec 3.1 注释）
    wuXingCount: emptyWuXingRecord(),
    wuXingHidden: emptyWuXingRecord(),
    wuXingScore,
    dayMasterWuXing: (rawScore.日主五行 as WuXing) ?? '金',
    yunDirection,
    yunStartAge,
    daYun,
    jieQi: '',
    daysSinceJie: 0,
  };
}

function scoreEntry(raw: any): { score: number; ratio: number } {
  if (raw == null) return { score: 0, ratio: 0 };
  return {
    score: typeof raw.分值 === 'number' ? raw.分值 : 0,
    ratio: parseRatio(raw.占比),
  };
}

// 不导出 getBaziChart 原函数——保持封装，所有调用走 adaptBaziCore。
