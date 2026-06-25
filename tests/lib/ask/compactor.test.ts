// tests/lib/ask/compactor.test.ts
// 对话压缩测试（M7 Phase 2）。纯函数离线测（compactMessages 涉及 LLM，端到端验）。

import { describe, it, expect } from 'vitest';
import { needsCompact, COMPACT_THRESHOLD, messagesTokens } from '@/lib/ask/compactor';

describe('needsCompact', () => {
  it('低于阈值不压缩', () => {
    expect(needsCompact(50000)).toBe(false);
  });
  it('恰好阈值不压缩（> 严格）', () => {
    expect(needsCompact(COMPACT_THRESHOLD)).toBe(false);
  });
  it('超阈值压缩', () => {
    expect(needsCompact(COMPACT_THRESHOLD + 1)).toBe(true);
  });
});

describe('messagesTokens', () => {
  it('累加各消息 token', () => {
    const t = messagesTokens([
      { role: 'user', content: '甲木' },
      { role: 'assistant', content: '乙木' },
    ]);
    expect(t).toBeGreaterThan(0);
  });
  it('优先用 tokens 字段', () => {
    const t = messagesTokens([
      { role: 'user', content: '甲木', tokens: 100 },
      { role: 'assistant', content: '乙木', tokens: 200 },
    ]);
    expect(t).toBe(300);
  });
});
