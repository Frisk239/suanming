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

/** xuanxue 八字核心书（与 corpus-loader loadXuanxue 的 targetBooks 一致） */
const XUANXUE_BOOKS = [
  '滴天髓阐微',
  '滴天髓-原文',
  '子平真诠',
  '穷通宝鉴',
  '三命通会',
  '神锋通考', // 目录名用"锋"（corpus-loader 已核验）
  '命理探源',
  '命理约言',
  // M6b 语料扩充新增
  '五行精纪',
  '李虚中命书',
  '御定子平',
  '子平管见',
];

/** lookfate 补充书（与 corpus-loader loadLookfate 一致） */
const LOOKFATE_BOOKS = ['五行大义', '千里命稿', '命理约言', '神峰通考'];

/** guji 外部下载书（与 corpus-loader loadGuji 一致，M6b 新增） */
const GUJI_BOOKS = ['渊海子平', '造化元钥(评注)'];

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

  console.log('\n【guji 源·M6b外部下载】书名 | DB chunk | 状态');
  console.log('---|---|---');
  for (const book of GUJI_BOOKS) {
    const dbN = db[book] ?? 0;
    totalDb += dbN;
    console.log(`${book} | (外部) | ${dbN} | ${dbN > 0 ? '✅' : '❌ 未入库'}`);
  }

  console.log(`\n合计：sample ${totalSample} 章节 / DB ${totalDb} chunk`);

  // DB 里有但 sample 列表没有的书（排查异常）
  const knownBooks = new Set([...XUANXUE_BOOKS, ...LOOKFATE_BOOKS, ...GUJI_BOOKS]);
  const extra = Object.keys(db).filter((b) => !knownBooks.has(b));
  if (extra.length > 0) {
    console.log(`\n【DB 额外书】(不在 corpus-loader 目标列表)：${extra.join(', ')}`);
  }
}

// 检索抽检（Task 5 Step 5）：代表性 query 看召回质量——覆盖新语料 + 排查噪声
async function retrieval() {
  const { retrieve } = await import('@/lib/rag/retriever');
  // 代表性 query：覆盖不同格局/用神/日主，检验：
  //   ① 新增语料（渊海子平/五行精纪/造化元钥）是否被合理召回
  //   ② 三命通会过滤后无"六X日XX时断"噪声残留
  //   ③ score 分布合理（相关内容 0.5+）
  const queries = [
    {
      name: '七杀格身弱（M2辛金案例方向）',
      q: { patternName: '七杀格', yongshenPrimary: '土', strengthLevel: '偏弱', dayMaster: '辛', monthBranch: '午' },
    },
    {
      name: '伤官格（应召回渊海子平论伤官）',
      q: { patternName: '伤官格', yongshenPrimary: '火', strengthLevel: '偏弱', dayMaster: '己', monthBranch: '巳' },
    },
    {
      name: '七杀格身强火炼秋金（乾隆方向）',
      q: { patternName: '羊刃格', yongshenPrimary: '火', strengthLevel: '偏强', dayMaster: '庚', monthBranch: '酉' },
    },
    {
      name: '冬水调候（曾国藩方向，应召回穷通宝鉴/造化元钥）',
      q: { patternName: '七杀格', yongshenPrimary: '木', strengthLevel: '偏弱', dayMaster: '丙', monthBranch: '亥' },
    },
  ];

  console.log('=== M6b 检索抽检（RAG 重建后）===\n');
  for (const { name, q } of queries) {
    console.log(`\n【${name}】`);
    try {
      const results = await retrieve(q);
      if (results.length === 0) {
        console.log('  ⚠️ 无召回结果');
        continue;
      }
      for (const r of results.slice(0, 6)) {
        const score = r.score.toFixed(3);
        console.log(`  [${score}] ${r.chunk.book} · ${r.chunk.chapter}`);
        console.log(`    ${r.chunk.content.slice(0, 70).replace(/\n/g, ' ')}...`);
      }
    } catch (e) {
      console.log(`  ❌ 检索失败: ${(e as Error).message}`);
    }
  }

  // 噪声排查：抽查是否有"六X日XX时断"残留
  console.log('\n=== 噪声排查：三命通会过滤是否生效 ===');
  const supabase = createAdmin();
  const { data: noiseCheck } = await supabase
    .from('knowledge_chunks')
    .select('book,chapter')
    .eq('book', '三命通会')
    .or('chapter.like.%六甲日%,chapter.like.%六乙日%,chapter.like.%六丙日%');
  const noise = (noiseCheck ?? []).filter((r: { chapter: string }) =>
    /六[甲乙丙丁戊己庚辛壬癸]日.{0,8}时断/.test(r.chapter)
  );
  console.log(`  三命通会「六X日XX时断」残留: ${noise.length} 条（应为 0）`);
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
