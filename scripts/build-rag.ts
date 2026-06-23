// scripts/build-rag.ts
// 一次性建库：sample 语料 → 切片 → BGE-M3 embedding → Supabase knowledge_chunks。
// 运行：npx tsx scripts/build-rag.ts
// 首次会下载 BGE-M3 模型（~2GB）。建库后重跑会先清空再重建。
//
// 环境要求（见 docs/superpowers/HANDOFF.md "M3 关键注意点"）：
//   - .env.local 含 Supabase key + HTTPS_PROXY（本机需走 7890 代理连 Supabase/HF）
//   - DDL（建索引）走不了 HTTP 代理：建库后去 Supabase Dashboard 执行 0002_rag_indexes.sql

import { loadAllCorpus } from '../src/lib/rag/corpus-loader';
import { chunkAll } from '../src/lib/rag/chunker';
import { embedBatch } from '../src/lib/rag/embedder';
import { createAdmin } from '../src/lib/supabase/admin';
import dotenv from 'dotenv';

// scripts 用 tsx 跑,显式加载 .env.local(不像 vitest 有 config 自动加载)
dotenv.config({ path: '.env.local' });

const INSERT_BATCH = 100; // Supabase 单次 insert 限制，分批插

async function main() {
  console.log('=== 1. 加载语料 ===');
  const docs = loadAllCorpus();
  console.log(`  原始文档：${docs.length}`);

  console.log('=== 2. 切片 ===');
  const chunks = chunkAll(docs);
  console.log(`  切片数：${chunks.length}`);

  console.log('=== 3. 清空旧数据 ===');
  const supabase = createAdmin();
  const { error: delErr } = await supabase
    .from('knowledge_chunks')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (delErr) {
    console.error('清空失败:', delErr);
    process.exit(1);
  }

  console.log('=== 4. embedding（首次会下载模型 ~2GB）===');
  const contents = chunks.map((c) => c.content);
  const embeddings = await embedBatch(contents);
  console.log(`  embedding 完成：${embeddings.length} 条`);

  console.log('=== 5. 批量插入 Supabase ===');
  const rows = chunks.map((c, i) => ({
    book: c.book,
    chapter: c.chapter,
    category: c.category,
    content: c.content,
    translation: c.translation ?? null,
    embedding: embeddings[i],
  }));
  for (let i = 0; i < rows.length; i += INSERT_BATCH) {
    const batch = rows.slice(i, i + INSERT_BATCH);
    const { error } = await supabase.from('knowledge_chunks').insert(batch);
    if (error) {
      console.error(`插入失败（${i}-${i + INSERT_BATCH}）:`, error);
      process.exit(1);
    }
    console.log(`  插入 ${Math.min(i + INSERT_BATCH, rows.length)}/${rows.length}`);
  }

  console.log('=== 建库完成 ===');
  const { count } = await supabase
    .from('knowledge_chunks')
    .select('*', { count: 'exact', head: true });
  console.log(`  knowledge_chunks 总行数：${count}`);
  console.log('\n下一步：去 Supabase Dashboard → SQL Editor 执行 0002_rag_indexes.sql（建 ivfflat 索引 + match_knowledge RPC）');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
