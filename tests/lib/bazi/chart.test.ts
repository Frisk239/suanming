// tests/lib/bazi/chart.test.ts
import { describe, it, expect } from 'vitest';
import { buildChart } from '@/lib/bazi/chart';
import type { ChartInput } from '@/types/bazi';

const valid: ChartInput = {
  gender: 'male',
  solarDate: '1990-06-15 22:37',
  city: '北京',
};

describe('buildChart · 正常路径', () => {
  it('合法输入应返回排盘结果（日柱辛亥）', () => {
    const chart = buildChart(valid);
    expect(chart.day.ganZhi).toBe('辛亥');
  });
  it('不传 time 也能排盘（只给日期）', () => {
    const chart = buildChart({ ...valid, solarDate: '1990-06-15' });
    expect(chart.year.ganZhi).toBe('庚午');
  });
});

describe('buildChart · 入参校验', () => {
  it('缺 solarDate 应抛错', () => {
    expect(() => buildChart({ ...valid, solarDate: '' })).toThrow(/solarDate/);
  });
  it('格式错误的 solarDate 应抛错', () => {
    expect(() => buildChart({ ...valid, solarDate: '1990/6/15' })).toThrow(/格式/);
  });
  it('gender 非法应抛错', () => {
    expect(() => buildChart({ ...valid, gender: 'x' as any })).toThrow(/gender/);
  });
  it('缺 city 和 longitude 应抛错', () => {
    expect(() => buildChart({ ...valid, city: undefined })).toThrow(/city.*longitude|longitude.*city/);
  });
  it('只给 longitude 不给 city 应通过', () => {
    const chart = buildChart({ ...valid, city: undefined, longitude: 116.41 });
    expect(chart.longitude).toBe(116.41);
  });
});
