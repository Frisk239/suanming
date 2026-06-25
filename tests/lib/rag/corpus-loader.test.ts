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

describe('三命通会智能过滤（M6b）', () => {
  it('排除卷八~九「六X日XX时断」查表噪声（逐日逐时吉凶断，无理论价值且污染检索）', () => {
    const docs = loadAllCorpus().filter((d) => d.book === '三命通会');
    // 噪声章节：「六甲日甲子时断」/「六乙日丁丑时断」等 119 章逐日逐时查表
    const noise = docs.filter((d) => /六[甲乙丙丁戊己庚辛壬癸]日.{0,6}时断/.test(d.chapter));
    expect(noise.length).toBe(0);
  });

  it('保留卷一~七+卷十八字核心章节（神煞/格局/财官印/女命/口诀等）', () => {
    const docs = loadAllCorpus().filter((d) => d.book === '三命通会');
    // 应保留相当数量的八字核心章节（约 171 章）
    expect(docs.length).toBeGreaterThan(150);
    // 抽查核心章节存在
    expect(docs.some((d) => d.chapter.includes('论正官'))).toBe(true);
    expect(docs.some((d) => d.chapter.includes('论阳刃') || d.chapter.includes('论羊刃'))).toBe(true);
    expect(docs.some((d) => d.chapter.includes('看命口訣') || d.chapter.includes('看命口诀'))).toBe(true);
  });
});

describe('重复源去重（M6b）', () => {
  // 命理约言、神锋通考/神峰通考 在 xuanxue 和 lookfate 各收一版，导致重复入库。
  // 策略：以 xuanxue 版为准，lookfate 不再重复收这两本（lookfate 仅补 xuanxue 缺的书）。
  it('命理约言不应同时从 xuanxue 和 lookfate 两源入库', () => {
    const docs = loadAllCorpus().filter((d) => d.book === '命理约言');
    const sources = new Set(docs.map((d) => d.source));
    expect(sources.size).toBe(1); // 只从一个源收
  });

  it('神锋通考/神峰通考 应统一书名（避免异写导致重复）', () => {
    const docs = loadAllCorpus();
    const shenfeng = docs.filter((d) => d.book === '神锋通考' || d.book === '神峰通考');
    // 书名应统一为一个（取 xuanxue 的"神锋通考"为准）
    const bookNames = new Set(shenfeng.map((d) => d.book));
    expect(bookNames.size).toBe(1);
    expect([...bookNames][0]).toBe('神锋通考');
  });
});
