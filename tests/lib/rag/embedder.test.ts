// tests/lib/rag/embedder.test.ts
// 验证 BGE-M3 embed 返回 1024 维归一化向量。
// 首次跑会下载模型（~2GB），耗时较长。CI 可跳过。

import { describe, it, expect } from 'vitest';
import { embed } from '@/lib/rag/embedder';

describe('embedder · BGE-M3', () => {
  // 首次会下载模型（~2GB），超时设 5 分钟（含下载）
  it(
    '应返回 1024 维归一化向量',
    async () => {
      const vec = await embed('七杀格喜印化');
      expect(vec.length).toBe(1024);
      // 归一化后模长 ≈ 1
      const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
      expect(norm).toBeCloseTo(1, 1);
    },
    300000,
  );

  it('相似文本向量余弦相似度应高于无关文本', async () => {
    const a = await embed('七杀格喜印化，杀印相生为贵');
    const b = await embed('七杀用印化解，杀印相生格高');
    const c = await embed('今天天气真好，适合出门散步');
    const cos = (x: number[], y: number[]) => {
      let dot = 0;
      for (let i = 0; i < x.length; i++) dot += x[i] * y[i];
      return dot; // 已归一化，dot 即余弦相似度
    };
    expect(cos(a, b)).toBeGreaterThan(cos(a, c));
  }, 300000);
});
