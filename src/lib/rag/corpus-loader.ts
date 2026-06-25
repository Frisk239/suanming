// src/lib/rag/corpus-loader.ts
// 扫描 sample 目录的语料，返回 RawDoc 列表（不切片，切片见 chunker.ts）。
// 三套语料分别处理（xuanxue/lookfate/bazi-mingli 格式不同）。
// 路径基于实测核验（见 docs/sample-projects-guide.md）：
//   - xuanxue: 03-corpus-classics/xuanxue/docs/<书名>/NNN章节.md（含 index.md、assets/ 需排除）
//   - lookfate: 03-corpus-classics/lookfate-book/content/命/（文件 + 子目录混合）
//   - bazi-mingli: 04-skill-prompt/bazi-mingli/references/*.md（拼音命名 10 篇概念）

import fs from 'node:fs';
import path from 'node:path';

export interface RawDoc {
  source: 'xuanxue' | 'lookfate' | 'bazi-mingli';
  book: string;
  chapter: string;
  content: string;
}

const SAMPLE_ROOT = path.resolve(process.cwd(), 'sample/sample-project');

/** 仅收录 .md 文件，跳过 index.md */
function listMd(dir: string): string[] {
  return fs.readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'index.md');
}

/**
 * xuanxue：按目标书目目录扫，每个 md = 一个章节（纯古文无 markdown 标题）。
 * 注：只收八字核心书（避免把 3124 个文件全 embedding）。
 *   神峰通考在 xuanxue 里实际写作"神锋通考"（锋，已核验）。
 *
 * M6b 三命通会智能过滤（spec 4.2）：290 章含 119 章「六X日XX时断」逐日逐时
 * 查表噪声（卷八~九，60甲子日×12时辰吉凶断），无理论价值且污染检索——
 * 用户问"七杀格"可能召回到"六甲日甲子时断"的无关命例。过滤后保留卷一~七+
 * 卷十的 171 章八字核心（神煞/格局/财官印/女命/口诀）。
 */
function loadXuanxue(): RawDoc[] {
  const root = path.join(SAMPLE_ROOT, '03-corpus-classics/xuanxue/docs');
  const docs: RawDoc[] = [];
  const targetBooks = [
    '滴天髓阐微',
    '滴天髓-原文',
    '子平真诠',
    '穷通宝鉴',
    '三命通会',
    '神锋通考', // 实测目录名用"锋"（非"峰"）
    '命理探源',
    '命理约言',
  ];
  for (const book of targetBooks) {
    const dir = path.join(root, book);
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;
    for (const file of listMd(dir)) {
      const content = fs.readFileSync(path.join(dir, file), 'utf-8').trim();
      if (!content) continue;
      // 章节名：去 .md、去开头数字前缀（如 001、000），例 "000滴天髓阐微：通神论天道" → "滴天髓阐微：通神论天道"
      const chapter = file.replace(/\.md$/, '').replace(/^\d+/, '').trim() || file;
      // M6b：三命通会过滤「六X日XX时断」查表噪声（卷八~九，逐日逐时吉凶断）
      if (book === '三命通会' && isDayHourLookupNoise(chapter)) continue;
      docs.push({ source: 'xuanxue', book, chapter, content });
    }
  }
  return docs;
}

/**
 * 三命通会查表噪声判定（M6b）。
 * 卷八~九的「六甲日甲子时断」「六乙日丁丑时断」等是 60甲子日×12时辰的逐日逐时
 * 吉凶查表，119 章，重复性极高、无命理理论价值，会污染向量检索。排除之。
 */
function isDayHourLookupNoise(chapter: string): boolean {
  // 匹配「六[十干]日...时断」，如"卷 八·六甲日甲子时断（以下所忌月分与时间断）"
  return /六[甲乙丙丁戊己庚辛壬癸]日.{0,8}时断/.test(chapter);
}

/**
 * lookfate：仅补 xuanxue 没有的书。
 * 实测：命\ 下 五行大义.md 是文件；千里命稿/命理约言/神峰通考 是目录（非文件）。
 */
function loadLookfate(): RawDoc[] {
  const root = path.join(SAMPLE_ROOT, '03-corpus-classics/lookfate-book/content/命');
  const docs: RawDoc[] = [];
  if (!fs.existsSync(root)) return docs;

  // 文件形式：五行大义.md（xuanxue 缺）
  const targetFiles = ['五行大义.md'];
  for (const f of targetFiles) {
    const p = path.join(root, f);
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      const content = fs.readFileSync(p, 'utf-8').trim();
      if (content) {
        docs.push({ source: 'lookfate', book: f.replace(/\.md$/, ''), chapter: '全文', content });
      }
    }
  }

  // 目录形式：千里命稿/（xuanxue 缺的）。注：神峰通考/命理约言 xuanxue 已收，
  // 此处不再重复（M6b 去重——避免同书两源重复入库污染检索）。
  const targetDirs = ['千里命稿'];
  for (const d of targetDirs) {
    const dir = path.join(root, d);
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;
    for (const f of listMd(dir)) {
      const content = fs.readFileSync(path.join(dir, f), 'utf-8').trim();
      if (!content) continue;
      docs.push({
        source: 'lookfate',
        book: d,
        chapter: f.replace(/\.md$/, ''),
        content,
      });
    }
  }
  return docs;
}

/** bazi-mingli：10 个概念 md（拼音命名），繁体现代教学风 */
function loadBaziMingli(): RawDoc[] {
  const root = path.join(SAMPLE_ROOT, '04-skill-prompt/bazi-mingli/references');
  const docs: RawDoc[] = [];
  if (!fs.existsSync(root)) return docs;
  for (const f of listMd(root)) {
    const content = fs.readFileSync(path.join(root, f), 'utf-8').trim();
    if (!content) continue;
    docs.push({
      source: 'bazi-mingli',
      book: '命理概念',
      chapter: f.replace(/\.md$/, ''),
      content,
    });
  }
  return docs;
}

/** 加载全部语料（建库脚本调用） */
export function loadAllCorpus(): RawDoc[] {
  return [...loadXuanxue(), ...loadLookfate(), ...loadBaziMingli()];
}
