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
  source: 'xuanxue' | 'lookfate' | 'bazi-mingli' | 'guji';
  book: string;
  chapter: string;
  content: string;
}

const SAMPLE_ROOT = path.resolve(process.cwd(), 'sample/sample-project');
const GUJI_ROOT = path.join(SAMPLE_ROOT, 'guji'); // M6b 外部下载的高质量古籍

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
    // M6b 语料扩充：sample 现成高价值古籍（子平派之外的补充）
    '五行精纪', // 南宋廖中，古法纳音体系集大成，与子平派互补
    '李虚中命书', // 古法禄命祖师，纳音根脉
    '御定子平', // 清康熙官修四库本，用神/病神表述经典
    '子平管见', // 明雷鸣夏，格局歌诀+注解，天然适合 LLM 引用
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

/**
 * guji：M6b 外部下载的高质量古籍（sample 缺失或残缺的补全）。
 * 来源见 docs/superpowers/HANDOFF.md M6 章节。
 *   - 渊海子平.txt（mymmsc/books 仓库）：子平派开山祖完整版，sample 仅残缺 2 章
 *     按《论XX》章节标题切分（txt 无 md 结构，需手动分章）
 *   - 造化元钥(评注).md（xx.theovan.cn 仓库）：穷通宝鉴评注版，逐月调候用神增强
 */
function loadGuji(): RawDoc[] {
  const docs: RawDoc[] = [];
  if (!fs.existsSync(GUJI_ROOT)) return docs;

  // 1. 渊海子平完整版 txt：按《论XX》/《XX赋》/《XX歌》等标题切分
  const yuanhaiTxt = path.join(GUJI_ROOT, '渊海子平.txt');
  if (fs.existsSync(yuanhaiTxt)) {
    docs.push(...splitYuanhaiZiping(yuanhaiTxt));
  }

  // 2. 造化元钥评注版（穷通宝鉴评注）：整体作为一个文档（已按月分节）
  const zaohuaPath = path.join(GUJI_ROOT, 'xx.theovan.cn/content/命/造化元钥(评注).md');
  if (fs.existsSync(zaohuaPath)) {
    const content = fs.readFileSync(zaohuaPath, 'utf-8').trim();
    if (content) {
      docs.push({
        source: 'guji',
        book: '造化元钥(评注)',
        chapter: '穷通宝鉴评注·逐月调候',
        content,
      });
    }
  }

  return docs;
}

/**
 * 切分渊海子平 txt：按《论XX》/《XX赋》/《XX歌》/《XX诀》等书名号标题分章。
 * 大类分节【渊海子平】基础/十神/神煞/六亲/女命/赋论 作为章节前缀。
 */
function splitYuanhaiZiping(txtPath: string): RawDoc[] {
  const raw = fs.readFileSync(txtPath, 'utf-8');
  const lines = raw.split(/\r?\n/);
  const docs: RawDoc[] = [];

  let currentSection = '基础'; // 【渊海子平】XX 大类
  let currentTitle = ''; // 《论XX》章节标题
  let buffer: string[] = [];

  const flush = () => {
    const content = buffer.join('\n').trim();
    if (currentTitle && content.length > 30) {
      docs.push({
        source: 'guji',
        book: '渊海子平',
        chapter: `${currentSection}·${currentTitle}`,
        content,
      });
    }
    buffer = [];
  };

  for (const line of lines) {
    // 大类分节：【渊海子平】神煞 / 【渊海子平】六亲 等
    const sectionMatch = line.match(/^【渊海子平】\s*(.+)$/);
    if (sectionMatch) {
      flush();
      currentSection = sectionMatch[1].trim() || '基础';
      currentTitle = '';
      continue;
    }
    // 章节标题：《论XX》《XX赋》《XX歌》《XX诀》《XX篇》《XX说》
    const titleMatch = line.match(/^《([^》]{2,20})》\s*(.*)$/);
    if (titleMatch) {
      // 《诗诀》是上文论篇的附诗口诀，不单独成章，追加到当前论篇内容
      // （否则会产生大量只有一首四句诗的碎片章节，污染检索）
      const title = titleMatch[1].replace(/\s+/g, '').trim();
      if (/^诗诀?$|^诗訣$/.test(title)) {
        if (currentTitle) buffer.push(line);
        continue;
      }
      flush();
      currentTitle = title;
      // 标题行后的说明文字（如《论XX》各有所喜）也算内容
      const rest = titleMatch[2].trim();
      if (rest) buffer.push(rest);
      continue;
    }
    if (currentTitle) {
      buffer.push(line);
    }
  }
  flush();
  return docs;
}

/** 加载全部语料（建库脚本调用） */
export function loadAllCorpus(): RawDoc[] {
  return [...loadXuanxue(), ...loadLookfate(), ...loadBaziMingli(), ...loadGuji()];
}
