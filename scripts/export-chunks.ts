// scripts/export-chunks.ts
// 导出切片为 chunks.json,供 Python GPU 脚本(gh-embed.py)批量 embedding。
// 用法: npx tsx scripts/export-chunks.ts
// 输出: scripts/data/chunks.json

import { loadAllCorpus } from '../src/lib/rag/corpus-loader';
import { chunkAll } from '../src/lib/rag/chunker';
import fs from 'node:fs';
import path from 'node:path';

function main() {
  const docs = loadAllCorpus();
  const chunks = chunkAll(docs);
  console.log(`切片数: ${chunks.length}`);

  const outDir = path.resolve(process.cwd(), 'scripts/data');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'chunks.json');
  fs.writeFileSync(outPath, JSON.stringify(chunks), 'utf-8');
  console.log(`已导出: ${outPath}`);
}
main();
