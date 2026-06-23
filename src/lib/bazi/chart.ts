// src/lib/bazi/chart.ts
//
// ①层排盘业务入口：输入校验 → 调 adapter → 返回 BaziChart。
// 业务编排层，不直接接触 bazi-core（保持封装）。

import { adaptBaziCore } from './bazi-core-adapter';
import type { BaziChart, ChartInput } from '@/types/bazi';

/** 校验入参，抛错带可读信息 */
function validate(input: ChartInput): void {
  if (!input.solarDate) {
    throw new Error('solarDate 必填');
  }
  if (!/^\d{4}-\d{2}-\d{2}( \d{1,2}:\d{2})?$/.test(input.solarDate)) {
    throw new Error(`solarDate 格式应为 "YYYY-MM-DD HH:mm"，收到: ${input.solarDate}`);
  }
  if (input.gender !== 'male' && input.gender !== 'female') {
    throw new Error(`gender 必须为 male|female，收到: ${input.gender}`);
  }
  if (!input.city && input.longitude == null) {
    throw new Error('city 与 longitude 至少填一个');
  }
}

/** ①层排盘业务入口 */
export function buildChart(input: ChartInput): BaziChart {
  validate(input);
  return adaptBaziCore(input);
}
