// scripts/verify-rag.ts
// 建库后跑：验证检索召回质量。
// 运行：npx tsx scripts/verify-rag.ts
// 预期：检索到若干条，含穷通宝鉴论辛（精确）+ 滴天髓/子平真诠相关（向量）。

import { retrieve } from '../src/lib/rag/retriever';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  // 用 1990-06-15 北京男（青囊抓包同案例）的②层结果作查询
  const results = await retrieve({
    patternName: '七杀格',
    yongshenPrimary: '土',
    strengthLevel: '偏弱',
    dayMaster: '辛',
    monthBranch: '午',
  });
  console.log(`检索到 ${results.length} 条：`);
  for (const r of results) {
    console.log(
      `  [${r.chunk.book}·${r.chunk.chapter}] (score=${r.score.toFixed(3)}) ${r.chunk.content.slice(0, 60)}...`,
    );
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
