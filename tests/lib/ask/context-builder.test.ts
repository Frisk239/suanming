// tests/lib/ask/context-builder.test.ts
// 追问 context 拼装 + 偏离检测 + token 估算测试（M7 Phase 2）。
// 重点验证两条最高约束：①分层注入完整（全量层不丢）；②偏离检测关键词匹配行为。

import { describe, it, expect } from 'vitest';
import { estimateTokens } from '@/lib/ask/token-estimator';
import { isTopicCovered, matchedTopics } from '@/lib/ask/topic-detector';
import { buildAskUserPrompt, buildAskSystemPrompt } from '@/lib/ask/context-builder';
import type { ProfileSnapshot, InterpretSnapshot } from '@/lib/supabase/snapshot';

const profile = (over: Partial<ProfileSnapshot> = {}): ProfileSnapshot => ({
  id: '1',
  user_id: 'u1',
  chart_snapshot: { year: '甲子', day: { gan: '辛' } },
  analysis_snapshot: { pattern: { name: '七杀格' }, yongshen: { primary: '土' } },
  engine_version: 'm7-ask',
  ...over,
});

const interpret = (over: Partial<InterpretSnapshot> = {}): InterpretSnapshot => ({
  id: 'i1',
  birth_profile_id: '1',
  content: '辛金生于午月，七杀格，用神土。',
  classics_snapshot: [{ book: '穷通宝鉴', chapter: '论辛金', content: '辛金珠玉最怕红炉' }],
  ...over,
});

describe('estimateTokens', () => {
  it('中文按1.5倍', () => {
    expect(estimateTokens('甲木生于寅月')).toBeGreaterThan(5);
  });
  it('英文按词', () => {
    expect(estimateTokens('hello world')).toBeGreaterThan(0);
  });
  it('空字符串返回0', () => {
    expect(estimateTokens('')).toBe(0);
  });
  it('中英混合', () => {
    const t = estimateTokens('辛金 day master 土');
    expect(t).toBeGreaterThan(5);
  });
});

describe('isTopicCovered', () => {
  it('命中事业主题', () => {
    expect(isTopicCovered('我事业怎么样')).toBe(true);
  });
  it('命中财运主题', () => {
    expect(isTopicCovered('今年财运好吗')).toBe(true);
  });
  it('命中健康主题（脾胃）', () => {
    expect(isTopicCovered('脾胃不好')).toBe(true);
  });
  it('命中家人主题（父母）', () => {
    expect(isTopicCovered('父母健康吗')).toBe(true);
  });
  it('未命中（无关词）', () => {
    expect(isTopicCovered('今天天气如何')).toBe(false);
    expect(isTopicCovered('我的猫运势')).toBe(false);
  });
});

describe('matchedTopics', () => {
  it('返回命中的主题列表', () => {
    expect(matchedTopics('事业和财运')).toContain('事业');
    expect(matchedTopics('事业和财运')).toContain('财运');
  });
});

describe('buildAskSystemPrompt', () => {
  it('学者人设', () => {
    const p = buildAskSystemPrompt('scholar');
    expect(p).toContain('客观');
    expect(p).toContain('不泛化');
  });
  it('隐士人设', () => {
    const p = buildAskSystemPrompt('hermit');
    expect(p).toContain('风趣');
  });
});

describe('buildAskUserPrompt', () => {
  it('约束1：全量层四块全部注入（盘面/格局/全文/古籍）+ 本轮', () => {
    const prompt = buildAskUserPrompt({
      profile: profile(),
      interpret: interpret(),
      summary: null,
      recentMessages: [],
      question: '事业方向？',
    });
    // 全量层完整性（约束1关键：事实底座不丢）
    expect(prompt).toContain('甲子'); // chart_snapshot
    expect(prompt).toContain('七杀格'); // analysis_snapshot
    expect(prompt).toContain('辛金生于午月'); // interpret content
    expect(prompt).toContain('穷通宝鉴'); // classics
    // 本轮
    expect(prompt).toContain('事业方向');
    // 分隔标记
    expect(prompt).toContain('【命盘信息】');
    expect(prompt).toContain('【格局用神】');
    expect(prompt).toContain('【AI 详批全文】');
    expect(prompt).toContain('【相关古籍】');
    expect(prompt).toContain('【用户追问】');
  });

  it('压缩层：有 summary 和近期对话时注入', () => {
    const prompt = buildAskUserPrompt({
      profile: profile(),
      interpret: interpret(),
      summary: {
        topics: ['事业'],
        conclusions: { 事业: '七杀格宜武职' },
        focusPoints: ['升迁年份'],
      },
      recentMessages: [{ role: 'user', content: '之前问过事业' }],
      question: '再细问',
    });
    expect(prompt).toContain('【历史对话摘要】');
    expect(prompt).toContain('七杀格宜武职');
    expect(prompt).toContain('【近期对话】');
    expect(prompt).toContain('之前问过事业');
  });

  it('兜底：偏离时补的古籍注入', () => {
    const prompt = buildAskUserPrompt({
      profile: profile(),
      interpret: null,
      summary: null,
      recentMessages: [],
      question: '我的猫',
      fallbackClassics: [{ book: '补充', content: '偏题检索' }],
    });
    expect(prompt).toContain('【补充古籍');
    expect(prompt).toContain('偏题检索');
  });

  it('interpret 为空时不崩（只有盘面）', () => {
    const prompt = buildAskUserPrompt({
      profile: profile(),
      interpret: null,
      summary: null,
      recentMessages: [],
      question: '问',
    });
    expect(prompt).toContain('甲子');
    expect(prompt).not.toContain('【AI 详批全文】');
  });
});
