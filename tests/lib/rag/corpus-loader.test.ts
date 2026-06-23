// tests/lib/rag/corpus-loader.test.ts
// 验证 corpus-loader 能扫到三套语料（需 sample 目录在）。
// 断言基于实测（见 docs/sample-projects-guide.md）：约 470 个文档。

import { describe, it, expect } from 'vitest';
import { loadAllCorpus } from '@/lib/rag/corpus-loader';

describe('corpus-loader', () => {
  it('应加载到至少 100 个原始文档', () => {
    const docs = loadAllCorpus();
    expect(docs.length).toBeGreaterThan(100);
  });

  it('应包含滴天髓阐微（xuanxue 主力）', () => {
    const docs = loadAllCorpus();
    expect(docs.some((d) => d.book === '滴天髓阐微')).toBe(true);
  });

  it('应包含穷通宝鉴（调候源，retriever 精确查询依赖它）', () => {
    const docs = loadAllCorpus();
    expect(docs.some((d) => d.book === '穷通宝鉴')).toBe(true);
  });

  it('应包含命理概念（bazi-mingli 概念层）', () => {
    const docs = loadAllCorpus();
    expect(docs.some((d) => d.source === 'bazi-mingli')).toBe(true);
  });

  it('每个文档应有非空 content', () => {
    const docs = loadAllCorpus();
    for (const d of docs) {
      expect(d.content.length).toBeGreaterThan(30);
    }
  });

  it('三套语料 source 标记应齐全', () => {
    const docs = loadAllCorpus();
    const sources = new Set(docs.map((d) => d.source));
    expect(sources.has('xuanxue')).toBe(true);
    expect(sources.has('lookfate')).toBe(true);
    expect(sources.has('bazi-mingli')).toBe(true);
  });
});
