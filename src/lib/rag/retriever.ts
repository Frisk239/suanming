// src/lib/rag/retriever.ts
// 双路检索（spec 4.4）：
//   ① 向量 RAG：BGE-M3 query embedding → pgvector match_knowledge RPC（语义相似）
//   ② 结构化精确：按日主直接查穷通宝鉴调候（book=穷通宝鉴 + chapter 含"论日干"）
// 融合去重后返回 top-k（精确优先，调候最相关）。

import { embed } from './embedder';
import { createAdmin } from '@/lib/supabase/admin';
import type { RetrievalQuery, RetrievalResult, KnowledgeChunk } from './types';

/** ① 向量检索（match_knowledge RPC，由 0002 migration 提供） */
async function vectorSearch(queryText: string, topK: number): Promise<RetrievalResult[]> {
  const queryEmbedding = await embed(queryText);
  const supabase = createAdmin();
  const { data, error } = await supabase.rpc('match_knowledge', {
    query_embedding: queryEmbedding,
    match_count: topK,
  });
  if (error) {
    console.error('[retriever] 向量检索失败:', error);
    return [];
  }
  return (data ?? []).map((row: any) => ({
    chunk: {
      book: row.book,
      chapter: row.chapter,
      category: row.category,
      content: row.content,
      translation: row.translation,
    } as KnowledgeChunk,
    score: row.similarity,
  }));
}

/** ② 穷通宝鉴精确查询（按日主，chapter 含"论辛"等） */
async function exactLookup(query: RetrievalQuery, topK: number): Promise<RetrievalResult[]> {
  const supabase = createAdmin();
  const dayGanChapter = `论${query.dayMaster}`;
  const { data, error } = await supabase
    .from('knowledge_chunks')
    .select('book,chapter,category,content,translation')
    .eq('book', '穷通宝鉴')
    .ilike('chapter', `%${dayGanChapter}%`)
    .limit(topK);
  if (error) {
    console.error('[retriever] 精确查询失败:', error);
    return [];
  }
  return (data ?? []).map((chunk: KnowledgeChunk) => ({ chunk, score: 1.0 }));
}

/** 把②层结果拼成自然语言 query（spec 4.4：非键值对，embedding 对自然语理解更好） */
function buildQueryText(query: RetrievalQuery): string {
  return `这是一个${query.patternName}的命盘，日主${query.dayMaster}${query.strengthLevel}，用神为${query.yongshenPrimary}`;
}

/** 双路检索 + 融合去重（精确优先，因为调候最相关） */
export async function retrieve(query: RetrievalQuery): Promise<RetrievalResult[]> {
  const queryText = buildQueryText(query);
  const [semantic, exact] = await Promise.all([
    vectorSearch(queryText, 8),
    exactLookup(query, 4),
  ]);
  // 融合去重（按 content 前 50 字判重）
  const seen = new Set<string>();
  const merged: RetrievalResult[] = [];
  for (const r of [...exact, ...semantic]) {
    const key = r.chunk.content.slice(0, 50);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(r);
    }
  }
  return merged.slice(0, 12); // 总计最多 12 条
}
