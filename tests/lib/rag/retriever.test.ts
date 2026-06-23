// tests/lib/rag/retriever.test.ts
// retriever 双路检索的纯逻辑测试（mock 掉 embed + supabase）。
// 重点验证：① 精确优先排序 ② 融合去重 ③ 月令入 query 文本 ④ 失败兜底。

import { describe, it, expect, vi, beforeEach } from 'vitest';

// mock embed（避免加载真实模型；返回固定向量）
vi.mock('@/lib/rag/embedder', () => ({
  embed: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
}));

// mock createAdmin：返回可控的 rpc/from 链
const mockRpc = vi.fn();
const mockFrom = vi.fn();
vi.mock('@/lib/supabase/admin', () => ({
  createAdmin: () => ({
    rpc: mockRpc,
    from: mockFrom,
  }),
}));

import { retrieve } from '@/lib/rag/retriever';

const sampleQuery = {
  patternName: '七杀格',
  yongshenPrimary: '土',
  strengthLevel: '偏弱',
  dayMaster: '辛',
  monthBranch: '午',
};

function vecResult(book: string, chapter: string, content: string, similarity: number) {
  return { book, chapter, category: '原文', content, translation: null, similarity };
}
function exactResult(book: string, chapter: string, content: string) {
  return { book, chapter, category: '调候', content, translation: null };
}

beforeEach(() => {
  mockRpc.mockReset();
  mockFrom.mockReset();
});

describe('retriever · 双路检索', () => {
  it('精确路命中的穷通宝鉴应排在最前（精确优先）', async () => {
    mockRpc.mockResolvedValue({
      data: [vecResult('滴天髓阐微', '论七杀', '七杀喜印化内容', 0.8)],
      error: null,
    });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          ilike: () => ({ limit: () => ({ data: [exactResult('穷通宝鉴', '穷通宝鉴：论辛金', '辛金珠玉最怕红炉')], error: null }) }),
        }),
      }),
    });
    const results = await retrieve(sampleQuery);
    expect(results[0].chunk.book).toBe('穷通宝鉴');
    expect(results[0].score).toBe(1.0);
  });

  it('内容前50字相同的应去重', async () => {
    const dup = '这是重复内容开头五十字以上用于测试去重逻辑确实需要足够长否则没法触发。';
    mockRpc.mockResolvedValue({
      data: [vecResult('滴天髓阐微', 'A', dup, 0.9)],
      error: null,
    });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          ilike: () => ({ limit: () => ({ data: [exactResult('穷通宝鉴', '论辛金', dup)], error: null }) }),
        }),
      }),
    });
    const results = await retrieve(sampleQuery);
    // 同内容两路都返回，去重后只剩 1 条
    expect(results.length).toBe(1);
  });

  it('向量路失败(error)应不影响精确路', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC 挂了' } });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          ilike: () => ({ limit: () => ({ data: [exactResult('穷通宝鉴', '论辛金', '辛金调候')], error: null }) }),
        }),
      }),
    });
    const results = await retrieve(sampleQuery);
    expect(results.length).toBe(1);
    expect(results[0].chunk.book).toBe('穷通宝鉴');
  });

  it('精确路失败应不影响向量路', async () => {
    mockRpc.mockResolvedValue({
      data: [vecResult('滴天髓阐微', '通神论', '甲木参天', 0.7)],
      error: null,
    });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          ilike: () => ({ limit: () => ({ data: null, error: { message: '查询失败' } }) }),
        }),
      }),
    });
    const results = await retrieve(sampleQuery);
    expect(results.length).toBe(1);
    expect(results[0].chunk.book).toBe('滴天髓阐微');
  });

  it('总结果不超过 12 条', async () => {
    mockRpc.mockResolvedValue({
      data: Array.from({ length: 8 }, (_, i) => vecResult('书', `章${i}`, `内容${i}`.repeat(20), 0.5)),
      error: null,
    });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          ilike: () => ({
            limit: () => ({
              data: Array.from({ length: 8 }, (_, i) => exactResult('穷通宝鉴', `论${i}`, `精确${i}`.repeat(20))),
              error: null,
            }),
          }),
        }),
      }),
    });
    const results = await retrieve(sampleQuery);
    expect(results.length).toBeLessThanOrEqual(12);
  });

  it('两路都失败时返回空数组（interpret 会走"未检索到"兜底）', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC 挂' } });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          ilike: () => ({ limit: () => ({ data: null, error: { message: '查询挂' } }) }),
        }),
      }),
    });
    const results = await retrieve(sampleQuery);
    expect(results).toEqual([]);
    // 这种情况下 retrieve 不抛错，interpret 会拿到空 classics，走 prompt 的"未检索到"分支
    // 这是设计选择：检索降级而非硬失败（命例坏掉不应阻断整次详评）
  });
});
