// scripts/build-rag.ts
// 建库：把切片 + embedding 写入 Supabase knowledge_chunks。
//
// 两种模式（推荐 load,GPU 快）：
//   npx tsx scripts/build-rag.ts            # 默认 = load 模式（读 Python GPU 生成的 embeddings.json）
//   npx tsx scripts/build-rag.ts load       # 同上
//   npx tsx scripts/build-rag.ts incremental# TS ONNX CPU 逐条 embed（慢,断点续跑,fallback）
//
// GPU 路径(推荐):
//   1. npx tsx scripts/export-chunks.ts        # 导出 chunks.json
//   2. conda run -n sk-learn python scripts/gh-embed.py  # GPU 批量 embed → embeddings.json
//   3. npx tsx scripts/build-rag.ts load       # 读 embeddings.json 插库
//
// 环境要求：
//   - .env.local 含 Supabase key + HTTPS_PROXY（本机走 7890 代理连 Supabase）
//   - DDL（建索引）走不了代理：建库后去 Supabase Dashboard 执行 0002_rag_indexes.sql

import { loadAllCorpus } from '../src/lib/rag/corpus-loader';
import { chunkAll } from '../src/lib/rag/chunker';
import { embedBatch } from '../src/lib/rag/embedder';
import { createAdmin } from '../src/lib/supabase/admin';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

dotenv.config({ path: '.env.local' });

const mode = process.argv[2] ?? 'load';

/** 公共：清空旧数据 */
async function clearTable() {
  const supabase = createAdmin();
  const { error } = await supabase
    .from('knowledge_chunks')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) {
    console.error('清空失败:', error);
    process.exit(1);
  }
  console.log('  已清空旧数据');
}

/** 公共：批量插入（每 100 条一批） */
async function insertAll(
  rows: Array<{
    book: string;
    chapter: string;
    category: string;
    content: string;
    translation: string | null;
    embedding: number[];
  }>,
) {
  const supabase = createAdmin();
  const BATCH = 100;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase.from('knowledge_chunks').insert(batch);
    if (error) {
      console.error(`插入失败（#${i}-${i + BATCH}）:`, error);
      process.exit(1);
    }
    console.log(`  插入 ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }
}

/** load 模式：读 embeddings.json（Python GPU 生成）插库 */
async function loadMode() {
  const embPath = path.resolve(process.cwd(), 'scripts/data/embeddings.json');
  if (!fs.existsSync(embPath)) {
    console.error(`找不到 ${embPath}`);
    console.error('请先按顺序执行：');
    console.error('  1. npx tsx scripts/export-chunks.ts');
    console.error('  2. conda run -n sk-learn python scripts/gh-embed.py');
    process.exit(1);
  }
  console.log('=== load 模式：读 embeddings.json ===');
  const records = JSON.parse(fs.readFileSync(embPath, 'utf-8'));
  console.log(`  记录数：${records.length}`);
  console.log('=== 清空旧数据 ===');
  await clearTable();
  console.log('=== 插入 Supabase ===');
  await insertAll(records);
  await reportCount();
}

/** incremental 模式：TS ONNX CPU 逐条 embed，断点续跑（fallback，慢） */
async function incrementalMode() {
  console.log('=== incremental 模式（TS ONNX CPU，断点续跑）===');
  console.log('=== 1. 加载语料 ===');
  const docs = loadAllCorpus();
  console.log(`  原始文档：${docs.length}`);
  console.log('=== 2. 切片 ===');
  const chunks = chunkAll(docs);
  console.log(`  切片数：${chunks.length}`);

  const supabase = createAdmin();
  const { count: existing } = await supabase
    .from('knowledge_chunks')
    .select('*', { count: 'exact', head: true });
  const startIdx = existing ?? 0;
  console.log(`  已入库：${startIdx} 条`);

  if (startIdx === 0) {
    console.log('=== 3. 首次建库，清空旧数据 ===');
    await clearTable();
  } else if (startIdx >= chunks.length) {
    console.log(`\n=== 已全部建库（${startIdx}/${chunks.length}），无需继续 ===`);
    process.exit(0);
  } else {
    console.log(`=== 3. 从断点续跑（跳过前 ${startIdx} 条）===`);
  }

  // 批量 embed（每 EMBED_BATCH 条调一次微服务，替代逐条；微服务内部分批 encode）
  const EMBED_BATCH = 50;
  let done = startIdx;
  for (let i = startIdx; i < chunks.length; i += EMBED_BATCH) {
    const slice = chunks.slice(i, Math.min(i + EMBED_BATCH, chunks.length));
    let embeddings: number[][];
    try {
      embeddings = await embedBatch(slice.map((c) => c.content));
    } catch (e) {
      console.error(`\nembed 失败 (#${i + 1}-${i + slice.length}):`, e);
      process.exit(1);
    }
    const rows = slice.map((c, j) => ({
      book: c.book,
      chapter: c.chapter,
      category: c.category,
      content: c.content,
      translation: c.translation ?? null,
      embedding: embeddings[j],
    }));
    const { error } = await supabase.from('knowledge_chunks').insert(rows);
    if (error) {
      console.error(`\n插入失败（#${i + slice.length}）:`, error);
      process.exit(1);
    }
    done = i + slice.length;
    console.log(`  已落盘 ${done}/${chunks.length}`);
  }
  await reportCount();
}

async function reportCount() {
  const supabase = createAdmin();
  const { count } = await supabase
    .from('knowledge_chunks')
    .select('*', { count: 'exact', head: true });
  console.log('\n=== 建库完成 ===');
  console.log(`  knowledge_chunks 总行数：${count}`);
  console.log(
    '\n下一步：去 Supabase Dashboard → SQL Editor 执行 0002_rag_indexes.sql（建 ivfflat 索引 + match_knowledge RPC）',
  );
  process.exit(0);
}

dotenv.config({ path: '.env.local' });
if (mode === 'load') {
  loadMode().catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else if (mode === 'incremental') {
  incrementalMode().catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else {
  console.error(`未知模式: ${mode}（应为 load 或 incremental）`);
  process.exit(1);
}
