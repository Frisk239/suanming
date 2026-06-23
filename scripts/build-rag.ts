// scripts/build-rag.ts
// 建库：sample 语料 → 切片 → BGE-M3 embedding → Supabase knowledge_chunks。
// 运行：npx tsx scripts/build-rag.ts
//
// 增量式：边 embed 边写库（每 WRITE_EVERY 条插入一次），重跑从断点续跑。
//   - 首次：清空旧数据，从头 embed
//   - 重跑：读已入库行数 N，跳过前 N 条已 embed 的 chunk，从第 N+1 条继续
//   - 适合 CPU 慢推理（单条 ~2s）+ 可能被 exec 超时杀的场景，进度不丢
//
// 环境要求（见 docs/superpowers/HANDOFF.md "M3 关键注意点"）：
//   - .env.local 含 Supabase key + HTTPS_PROXY（本机需走 7890 代理连 Supabase/HF）
//   - DDL（建索引）走不了 HTTP 代理：建库后去 Supabase Dashboard 执行 0002_rag_indexes.sql

import { loadAllCorpus } from '../src/lib/rag/corpus-loader';
import { chunkAll } from '../src/lib/rag/chunker';
import { embed } from '../src/lib/rag/embedder';
import { createAdmin } from '../src/lib/supabase/admin';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const WRITE_EVERY = 20; // 每完成这么多条就写库一次（进度落盘）

async function main() {
  console.log('=== 1. 加载语料 ===');
  const docs = loadAllCorpus();
  console.log(`  原始文档：${docs.length}`);

  console.log('=== 2. 切片 ===');
  const chunks = chunkAll(docs);
  console.log(`  切片数：${chunks.length}`);

  const supabase = createAdmin();

  // 读已入库行数（断点续跑）
  const { count: existing } = await supabase
    .from('knowledge_chunks')
    .select('*', { count: 'exact', head: true });
  const startIdx = existing ?? 0;
  console.log(`  已入库：${startIdx} 条`);

  if (startIdx === 0) {
    console.log('=== 3. 首次建库，清空旧数据 ===');
    const { error: delErr } = await supabase
      .from('knowledge_chunks')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (delErr) {
      console.error('清空失败:', delErr);
      process.exit(1);
    }
  } else if (startIdx >= chunks.length) {
    console.log(`\n=== 已全部建库（${startIdx}/${chunks.length}），无需继续 ===`);
    process.exit(0);
  } else {
    console.log(`=== 3. 从断点续跑（跳过前 ${startIdx} 条，从 ${startIdx + 1} 开始）===`);
  }

  console.log(`=== 4. 增量 embedding + 插入（每 ${WRITE_EVERY} 条落盘）===`);
  let buf: Array<{
    book: string;
    chapter: string;
    category: string;
    content: string;
    translation: string | null;
    embedding: number[];
  }> = [];
  let done = startIdx;
  for (let i = startIdx; i < chunks.length; i++) {
    const c = chunks[i];
    let embedding: number[];
    try {
      embedding = await embed(c.content);
    } catch (e) {
      console.error(`\nembed 失败 (#${i + 1} 《${c.book}·${c.chapter}》):`, e);
      process.exit(1);
    }
    buf.push({
      book: c.book,
      chapter: c.chapter,
      category: c.category,
      content: c.content,
      translation: c.translation ?? null,
      embedding,
    });
    done = i + 1;

    if (buf.length >= WRITE_EVERY) {
      const { error } = await supabase.from('knowledge_chunks').insert(buf);
      if (error) {
        console.error(`\n插入失败（#${done}）:`, error);
        process.exit(1);
      }
      buf = [];
      console.log(`  已落盘 ${done}/${chunks.length}`);
    }
  }
  // 尾巴
  if (buf.length > 0) {
    const { error } = await supabase.from('knowledge_chunks').insert(buf);
    if (error) {
      console.error('插入尾巴失败:', error);
      process.exit(1);
    }
    console.log(`  已落盘 ${done}/${chunks.length}`);
  }

  console.log('\n=== 建库完成 ===');
  const { count } = await supabase
    .from('knowledge_chunks')
    .select('*', { count: 'exact', head: true });
  console.log(`  knowledge_chunks 总行数：${count}`);
  if ((count ?? 0) >= chunks.length) {
    console.log('\n下一步：去 Supabase Dashboard → SQL Editor 执行 0002_rag_indexes.sql（建 ivfflat 索引 + match_knowledge RPC）');
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
