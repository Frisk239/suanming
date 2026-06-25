// scripts/eval-rag.ts
// M6b RAG 诊断（spec 4.3 步骤1）：统计 sample 章节数 vs DB 入库 chunk 数，定位收录缺口。
// 后续步骤加检索抽检功能（Task 5 Step 5 用）。
// 用法：
//   npx tsx scripts/eval-rag.ts            # 诊断收录缺口
//   npx tsx scripts/eval-rag.ts retrieval  # 检索抽检（Task 5 用，占位待实现）

import fs from 'node:fs';
import path from 'node:path';
import { createAdmin } from '@/lib/supabase/admin';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SAMPLE_ROOT = path.resolve(process.cwd(), 'sample/sample-project');
const XUANXUE_ROOT = path.join(SAMPLE_ROOT, '03-corpus-classics/xuanxue/docs');
const LOOKFATE_ROOT = path.join(SAMPLE_ROOT, '03-corpus-classics/lookfate-book/content/命');

/** xuanxue 8 本八字核心书（与 corpus-loader loadXuanxue 的 targetBooks 一致） */
const XUANXUE_BOOKS = [
  '滴天髓阐微',
  '滴天髓-原文',
  '子平真诠',
  '穷通宝鉴',
  '三命通会',
  '神锋通考', // 目录名用"锋"（corpus-loader 已核验）
  '命理探源',
  '命理约言',
];

/** lookfate 补充书（与 corpus-loader loadLookfate 一致） */
const LOOKFATE_BOOKS = ['五行大义', '千里命稿', '命理约言', '神峰通考'];

/** 仅收录 .md 文件，跳过 index.md */
function listMd(dir: string): string[] {
  return fs.readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'index.md');
}

/** 统计 sample 里 xuanxue 每本书的 .md 章节数 */
function countXuanxueChapters(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const book of XUANXUE_BOOKS) {
    const dir = path.join(XUANXUE_ROOT, book);
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
      counts[book] = 0;
      continue;
    }
    counts[book] = listMd(dir).length;
  }
  return counts;
}

/** 统计 lookfate 每本书章节数（五行大义=1 文件；其余=目录分章） */
function countLookfateChapters(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const book of LOOKFATE_BOOKS) {
    // 五行大义是单文件
    const file = path.join(LOOKFATE_ROOT, `${book}.md`);
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      counts[book] = 1;
      continue;
    }
    const dir = path.join(LOOKFATE_ROOT, book);
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
      counts[book] = 0;
      continue;
    }
    counts[book] = listMd(dir).length;
  }
  return counts;
}

/** 统计 DB 里每本书的 chunk 数 */
async function countDbChunks(): Promise<Record<string, number>> {
  const supabase = createAdmin();
  const { data, error } = await supabase.from('knowledge_chunks').select('book');
  if (error) {
    console.error('查询失败:', error.message);
    process.exit(1);
  }
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.book] = (counts[row.book] ?? 0) + 1;
  }
  return counts;
}

function statusMark(dbN: number, sampleN: number): string {
  if (dbN === 0) return '❌ 未入库';
  if (sampleN > 0 && dbN < sampleN * 0.8) return '⚠️ 可能漏收';
  return '✅';
}

async function diagnose() {
  console.log('=== M6b RAG 收录缺口诊断 ===\n');

  const xuanxue = countXuanxueChapters();
  const lookfate = countLookfateChapters();
  const db = await countDbChunks();

  console.log('【xuanxue 源】书名 | sample章节 | DB chunk | 状态');
  console.log('---|---|---|---');
  let totalSample = 0;
  let totalDb = 0;
  for (const [book, sampleN] of Object.entries(xuanxue)) {
    const dbN = db[book] ?? 0;
    totalSample += sampleN;
    totalDb += dbN;
    console.log(`${book} | ${sampleN} | ${dbN} | ${statusMark(dbN, sampleN)}`);
  }

  console.log('\n【lookfate 源】书名 | sample章节 | DB chunk | 状态');
  console.log('---|---|---|---');
  for (const [book, sampleN] of Object.entries(lookfate)) {
    const dbN = db[book] ?? 0;
    totalSample += sampleN;
    totalDb += dbN;
    console.log(`${book} | ${sampleN} | ${dbN} | ${statusMark(dbN, sampleN)}`);
  }

  console.log(`\n合计：sample ${totalSample} 章节 / DB ${totalDb} chunk`);

  // DB 里有但 sample 列表没有的书（排查异常）
  const knownBooks = new Set([...XUANXUE_BOOKS, ...LOOKFATE_BOOKS]);
  const extra = Object.keys(db).filter((b) => !knownBooks.has(b));
  if (extra.length > 0) {
    console.log(`\n【DB 额外书】(不在 corpus-loader 目标列表)：${extra.join(', ')}`);
  }
}

// 检索抽检（Task 5 Step 5 实现）
async function retrieval() {
  console.log('检索抽检功能见 Task 5 Step 5（待实现）');
}

const mode = process.argv[2] ?? 'diagnose';
if (mode === 'diagnose') {
  diagnose().catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else if (mode === 'retrieval') {
  retrieval().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
