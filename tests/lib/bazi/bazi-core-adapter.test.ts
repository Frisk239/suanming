// tests/lib/bazi/bazi-core-adapter.test.ts
// adapter 验证：以青囊抓包同案例（1990-06-15 22:37 北京男）为标准答案。
// 对照 M1 计划 Task 10 速查表。
import { describe, it, expect } from 'vitest';
import { adaptBaziCore } from '@/lib/bazi/bazi-core-adapter';
import type { ChartInput } from '@/types/bazi';

const input: ChartInput = {
  name: '测试',
  gender: 'male',
  solarDate: '1990-06-15 22:37',
  city: '北京',
  useTrueSolar: true,
  sect: 1,
};

describe('adaptBaziCore · 四柱', () => {
  it('年柱应为庚午', () => {
    const chart = adaptBaziCore(input);
    expect(chart.year.ganZhi).toBe('庚午');
  });
  it('月柱应为壬午', () => {
    const chart = adaptBaziCore(input);
    expect(chart.month.ganZhi).toBe('壬午');
  });
  it('日柱应为辛亥（日主）', () => {
    const chart = adaptBaziCore(input);
    expect(chart.day.ganZhi).toBe('辛亥');
    expect(chart.day.shiShenGan).toBe('日主');
  });
  it('时柱应为己亥', () => {
    const chart = adaptBaziCore(input);
    expect(chart.time.ganZhi).toBe('己亥');
  });
});

describe('adaptBaziCore · 单柱明细', () => {
  it('年柱藏干应为丁己', () => {
    const chart = adaptBaziCore(input);
    expect(chart.year.hideGan).toEqual(['丁', '己']);
  });
  it('日柱藏干应为壬甲', () => {
    const chart = adaptBaziCore(input);
    expect(chart.day.hideGan).toEqual(['壬', '甲']);
  });
  it('年柱天干十神应为劫财', () => {
    const chart = adaptBaziCore(input);
    expect(chart.year.shiShenGan).toBe('劫财');
  });
  it('纳音应含路旁土/杨柳木/钗钏金/平地木', () => {
    const chart = adaptBaziCore(input);
    expect(chart.year.naYin).toBe('路旁土');
    expect(chart.month.naYin).toBe('杨柳木');
    expect(chart.day.naYin).toBe('钗钏金');
    expect(chart.time.naYin).toBe('平地木');
  });
  it('日柱地势(星运)应为沐浴', () => {
    const chart = adaptBaziCore(input);
    expect(chart.day.diShi).toBe('沐浴');
  });
});

describe('adaptBaziCore · 大运', () => {
  it('大运第一步应为癸未，8-17岁，1997-2006', () => {
    const chart = adaptBaziCore(input);
    expect(chart.daYun.length).toBeGreaterThan(0);
    expect(chart.daYun[0]).toEqual({
      ganZhi: '癸未',
      startAge: 8,
      endAge: 17,
      startYear: 1997,
      endYear: 2006,
    });
  });
  it('大运方向应为顺行', () => {
    const chart = adaptBaziCore(input);
    expect(chart.yunDirection).toBe('顺行');
  });
  it('起运虚岁应为8', () => {
    const chart = adaptBaziCore(input);
    expect(chart.yunStartAge).toBe(8);
  });
});

describe('adaptBaziCore · 五行分值与命宫', () => {
  it('五行分值应为 金2木1水3火2土2', () => {
    const chart = adaptBaziCore(input);
    expect(chart.wuXingScore.金.score).toBe(2);
    expect(chart.wuXingScore.木.score).toBe(1);
    expect(chart.wuXingScore.水.score).toBe(3);
    expect(chart.wuXingScore.火.score).toBe(2);
    expect(chart.wuXingScore.土.score).toBe(2);
  });
  it('占比应 parse 为小数（水30%）', () => {
    const chart = adaptBaziCore(input);
    expect(chart.wuXingScore.水.ratio).toBeCloseTo(0.3);
  });
  it('日主五行应为金', () => {
    const chart = adaptBaziCore(input);
    expect(chart.dayMasterWuXing).toBe('金');
  });
  it('命宫/身宫/胎元应非空', () => {
    const chart = adaptBaziCore(input);
    expect(chart.mingGong).toBeTruthy();
    expect(chart.shenGong).toBeTruthy();
    expect(chart.taiYuan).toBeTruthy();
  });
});

describe('adaptBaziCore · 时间与性别', () => {
  it('真太阳时应接近 22:22', () => {
    const chart = adaptBaziCore(input);
    expect(chart.trueSolarTime).toContain('22:2');
  });
  it('性别回传应为 male', () => {
    const chart = adaptBaziCore(input);
    expect(chart.gender).toBe('male');
  });
});
