// tests/lib/llm/prompt.test.ts
// 验证四段式 prompt 含关键约束 + 命盘数据 + 古籍引用。

import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildUserPrompt } from '@/lib/llm/prompt';
import type { InterpretInput } from '@/lib/llm/types';
import type { BaziAnalysisResult } from '@/lib/bazi-engine';

const mockAnalysis = {
  strength: {
    score: -52,
    level: '偏弱',
    breakdown: { deLing: -26, deDi: -30, deShi: 4, dongTai: 0 },
    ratio: 0.2,
    deLingBool: false,
    deDiBool: false,
    deShiBool: true,
  },
  pattern: {
    name: '七杀格',
    type: '正格',
    basis: '月令本气丁七杀',
    transparent: false,
    success: true,
    pure: true,
  },
  yongshen: {
    primary: '土' as const,
    favor: ['火' as const, '土' as const],
    avoid: ['木' as const, '水' as const],
    xian: ['金' as const],
    method: '格局' as const,
    advice: '',
  },
  daYuns: [
    {
      ganZhi: '丙戌',
      startAge: 38,
      endAge: 47,
      startYear: 2027,
      endYear: 2036,
      assessment: { score: 28, tier: 'good' as const },
      events: [],
      narrativeSeed: ['顺应善神'],
    },
  ],
} as BaziAnalysisResult;

const input: InterpretInput = {
  chartSummary: {
    dayMaster: '辛',
    gender: '男',
    solarDate: '1990-06-15',
    lunarDate: '一九九〇年五月廿三',
    pillars: ['庚午', '壬午', '辛亥', '己亥'],
  },
  analysis: mockAnalysis,
  classics: [
    { chunk: { book: '子平真诠', chapter: '论七杀', category: '原文', content: '七杀喜印化' }, score: 0.9 },
  ],
  options: { persona: 'scholar', depth: 'standard' },
};

describe('prompt · 四段式', () => {
  it('系统 prompt 含"绝对真理"约束', () => {
    expect(buildSystemPrompt(input)).toContain('绝对真理');
    expect(buildSystemPrompt(input)).toContain('禁止篡改');
  });

  it('系统 prompt 含强制引用约束', () => {
    expect(buildSystemPrompt(input)).toContain('不得编造');
  });

  it('系统 prompt 含四段式结构（依据/推演/结论/边界）', () => {
    const sys = buildSystemPrompt(input);
    expect(sys).toContain('依据');
    expect(sys).toContain('推演');
    expect(sys).toContain('结论');
    expect(sys).toContain('边界');
  });

  it('用户 prompt 含命盘四柱 + 日主', () => {
    const user = buildUserPrompt(input);
    expect(user).toContain('庚午');
    expect(user).toContain('辛');
  });

  it('用户 prompt 含②层格局/用神', () => {
    const user = buildUserPrompt(input);
    expect(user).toContain('七杀格');
    expect(user).toContain('月令本气丁七杀');
    expect(user).toContain('土');
  });

  it('用户 prompt 含古籍引用原文', () => {
    const user = buildUserPrompt(input);
    expect(user).toContain('子平真诠');
    expect(user).toContain('七杀喜印化');
  });

  it('用户 prompt 含大运叙事种子', () => {
    const user = buildUserPrompt(input);
    expect(user).toContain('丙戌');
    expect(user).toContain('顺应善神');
  });

  it('无古籍时应标注"未检索到"', () => {
    const user = buildUserPrompt({ ...input, classics: [] });
    expect(user).toContain('未检索到');
  });

  it('人格/深度切换应反映到系统 prompt', () => {
    const hermit = buildSystemPrompt({ ...input, options: { persona: 'hermit', depth: 'popular' } });
    expect(hermit).toContain('幽默隐士');
    expect(hermit).toContain('通俗级');
  });
});
