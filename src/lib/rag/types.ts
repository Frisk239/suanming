// src/lib/rag/types.ts
// RAG 知识库类型定义。对应 Supabase 的 knowledge_chunks 表（M1 已建）+ 检索结果。
// 对齐 spec 第 4 节（RAG）。

/** 知识库切片（对应 knowledge_chunks 表） */
export interface KnowledgeChunk {
  id?: string;
  book: string; // 书名 "滴天髓阐微"
  chapter: string; // 章节 "论甲木"
  category: '原文' | '概念' | '调候';
  content: string; // 文本块
  translation?: string | null; // 白话（可选）
  embedding?: number[]; // 1024 维（建库时填，检索时不返回）
}

/** 检索结果 */
export interface RetrievalResult {
  chunk: KnowledgeChunk;
  score: number; // 相似度（余弦距离，越小越相似；或重排后 0-1）
}

/** 检索查询构造（从②层结果推导） */
export interface RetrievalQuery {
  patternName: string; // "七杀格"
  yongshenPrimary: string; // "土"
  strengthLevel: string; // "偏弱"
  dayMaster: string; // "辛"
  monthBranch: string; // "午"
}
