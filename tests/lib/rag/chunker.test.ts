// tests/lib/rag/chunker.test.ts
// 验证三套切片策略 + category 推断。

import { describe, it, expect } from 'vitest';
import { chunkDocument } from '@/lib/rag/chunker';
import type { RawDoc } from '@/lib/rag/corpus-loader';

describe('chunker', () => {
  it('xuanxue 无标题文档应按段落聚合', () => {
    const doc: RawDoc = {
      source: 'xuanxue',
      book: '滴天髓阐微',
      chapter: '通神论',
      content: '甲木参天。\n\n乙木虽柔。\n\n丙火炎上。',
    };
    const chunks = chunkDocument(doc);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks[0].category).toBe('原文');
    // 三段都太短(<MIN_CHUNK)应聚合成一块
    expect(chunks.length).toBe(1);
  });

  it('xuanxue 超长段落应按 MAX_CHUNK 切分', () => {
    const long = '甲木参天。'.repeat(400); // 2000 字，超 MAX_CHUNK
    const doc: RawDoc = {
      source: 'xuanxue',
      book: '滴天髓阐微',
      chapter: '通神论',
      content: `${long}\n\n${long}`,
    };
    const chunks = chunkDocument(doc);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('穷通宝鉴论甲木应为调候类', () => {
    const doc: RawDoc = {
      source: 'xuanxue',
      book: '穷通宝鉴',
      chapter: '论甲木',
      content: '甲木生于各月调候用庚劈甲引丁，秋木老健亦用金。',
    };
    const chunks = chunkDocument(doc);
    expect(chunks[0].category).toBe('调候');
  });

  it('bazi-mingli 应为概念类', () => {
    const doc: RawDoc = {
      source: 'bazi-mingli',
      book: '命理概念',
      chapter: '十神',
      content: '## 食神\n食神定义。\n\n## 伤官\n伤官定义。',
    };
    const chunks = chunkDocument(doc);
    expect(chunks[0].category).toBe('概念');
  });

  it('lookfate 按 ## 切，章节名取标题（body 需 ≥ MIN_CHUNK 才成块）', () => {
    const wuxingBody = '五行相生。金生水，水生木，木生火，火生土，土生金。'.repeat(4); // 超 80
    const ganzhiBody = '干支配合。天干地支相辅相成，六十甲子循环不息。'.repeat(4); // 超 80
    const doc: RawDoc = {
      source: 'lookfate',
      book: '五行大义',
      chapter: '全文',
      content: `# 五行大义\n## 论五行\n${wuxingBody}\n\n## 论干支\n${ganzhiBody}`,
    };
    const chunks = chunkDocument(doc);
    expect(chunks.some((c) => c.chapter === '论五行')).toBe(true);
    expect(chunks.some((c) => c.chapter === '论干支')).toBe(true);
  });

  it('lookfate 无 ## 时兜底按段落切', () => {
    const doc: RawDoc = {
      source: 'lookfate',
      book: '五行大义',
      chapter: '全文',
      content: '五行相生。\n\n金生水，水生木。',
    };
    const chunks = chunkDocument(doc);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });
});
