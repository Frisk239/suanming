// src/lib/rag/chunker.ts
// 切片策略（基于语料格式核验，见 docs/sample-projects-guide.md）：
//   - xuanxue：无 markdown 标题的纯古文，按段落空行聚合，目标 500-1500 字/chunk
//   - lookfate / bazi-mingli：有 ## 标题，按 ## 切；超长再回退段落切
// 原文/注疏对照（原文：/徐注：/任氏曰：）合并保留，不切开。
// category（原文/概念/调候）由书名+章节名推断。

import type { RawDoc } from './corpus-loader';
import type { KnowledgeChunk } from './types';

const MIN_CHUNK = 80; // 太短合并到相邻
const MAX_CHUNK = 1500; // 太长再切

/** 判断是否调候类（穷通宝鉴论甲~癸，章节含天干） */
function isTiaohou(book: string, chapter: string): boolean {
  if (book !== '穷通宝鉴') return false;
  return /甲|乙|丙|丁|戊|己|庚|辛|壬|癸/.test(chapter);
}

/** 推断 category */
function inferCategory(doc: RawDoc): KnowledgeChunk['category'] {
  if (isTiaohou(doc.book, doc.chapter)) return '调候';
  if (doc.source === 'bazi-mingli') return '概念';
  return '原文';
}

/** xuanxue 切片：按段落空行聚合 */
function chunkXuanxue(doc: RawDoc): KnowledgeChunk[] {
  const category = inferCategory(doc);
  const paragraphs = doc.content.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const chunks: KnowledgeChunk[] = [];
  let buf = '';
  for (const p of paragraphs) {
    if (buf && (buf + p).length > MAX_CHUNK) {
      chunks.push({ book: doc.book, chapter: doc.chapter, category, content: buf });
      buf = p;
    } else {
      buf = buf ? `${buf}\n\n${p}` : p;
    }
  }
  if (buf) {
    if (buf.length >= MIN_CHUNK) {
      chunks.push({ book: doc.book, chapter: doc.chapter, category, content: buf });
    } else if (chunks.length > 0) {
      // 太短合并到上一个
      chunks[chunks.length - 1].content += `\n\n${buf}`;
    } else {
      // 整个文档就这么短，单独成块
      chunks.push({ book: doc.book, chapter: doc.chapter, category, content: buf });
    }
  }
  return chunks;
}

/** lookfate / bazi-mingli 切片：按 ## 标题切 */
function chunkByHeading(doc: RawDoc): KnowledgeChunk[] {
  const category = inferCategory(doc);
  // 去掉一级标题（# 书名），按 ## 切
  const sections = doc.content.split(/^## /m).filter((s) => s.trim());
  const chunks: KnowledgeChunk[] = [];
  for (const section of sections) {
    const lines = section.split('\n');
    const heading = lines[0].trim();
    const body = lines.slice(1).join('\n').trim();
    if (!body || body.length < MIN_CHUNK) continue;
    if (body.length > MAX_CHUNK) {
      // 超 MAX 再按段落切，章节名带小标题
      const sub = chunkXuanxue({ ...doc, content: body });
      for (const s of sub) {
        chunks.push({ ...s, chapter: `${doc.chapter} · ${heading}` });
      }
    } else {
      chunks.push({ book: doc.book, chapter: heading, category, content: body });
    }
  }
  // 整个文档无 ## 的兜底：按段落切
  if (chunks.length === 0) return chunkXuanxue(doc);
  return chunks;
}

/** 切片入口（按 source 分派） */
export function chunkDocument(doc: RawDoc): KnowledgeChunk[] {
  if (doc.source === 'xuanxue') return chunkXuanxue(doc);
  return chunkByHeading(doc);
}

/** 批量切片 */
export function chunkAll(docs: RawDoc[]): KnowledgeChunk[] {
  return docs.flatMap(chunkDocument);
}
