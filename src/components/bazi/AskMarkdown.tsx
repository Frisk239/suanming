// src/components/bazi/AskMarkdown.tsx
// 追问回答的轻量 markdown 渲染（M7）。
//
// spec 5.1 原则：不引 UI/markdown 库，自绘够用。
// 追问回答（DeepSeek）实测输出格式：### 三级标题 / **粗体** / - 列表 / 《书名》 / 段落。
// 本组件把这些渲染成华彩风格（标题带金线、列表带项目符号），避免符号裸露。
//
// 与 InterpretPanel 的 RichText 区分：那个只处理 **bold**（配合 segment 切分），
// 本组件额外处理 ### 标题和 - 列表，服务追问多轮对话的多样输出。

import { Fragment } from 'react';

/**
 * 行内富文本：**bold** + 《书名》强调。
 * **xxx** → 粗体深黛青；《xxx》→ 琥珀金衬线（古籍引用感）。
 */
function Inline({ text }: { text: string }) {
  // 先按 ** 拆 bold，每个片段内再把《》高亮
  const boldParts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {boldParts.map((p, i) => {
        if (i % 2 === 1) {
          return (
            <strong key={i} className="font-semibold text-dai-qing-dark">
              {p}
            </strong>
          );
        }
        // 《书名》高亮（琥珀金衬线，呼应古籍引用）
        const bookParts = p.split(/(《[^》]+》)/g);
        return (
          <Fragment key={i}>
            {bookParts.map((bp, bi) =>
              /^《[^》]+》$/.test(bp) ? (
                <span key={bi} className="font-serif-display text-hu-po-jin-dark">
                  {bp}
                </span>
              ) : (
                <Fragment key={bi}>{bp}</Fragment>
              ),
            )}
          </Fragment>
        );
      })}
    </>
  );
}

interface Block {
  type: 'heading' | 'list' | 'paragraph';
  level?: number; // heading 用
  items?: string[]; // list 用
  text?: string; // paragraph 用
}

/** 把 markdown 文本切成块（标题/列表/段落） */
function parseBlocks(md: string): Block[] {
  const lines = md.split('\n');
  const blocks: Block[] = [];
  let para: string[] = [];

  const flushPara = () => {
    if (para.length > 0) {
      blocks.push({ type: 'paragraph', text: para.join('\n').trim() });
      para = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    // 三级标题 ### xxx（也兼容误用的 ## / #）
    const h = line.match(/^(#{1,4})\s+(.+)$/);
    if (h) {
      flushPara();
      blocks.push({ type: 'heading', level: h[1].length, text: h[2].trim() });
      continue;
    }
    // 无序列表 - xxx / * xxx
    if (/^[-*]\s+/.test(line.trim())) {
      flushPara();
      const item = line.trim().replace(/^[-*]\s+/, '');
      const last = blocks[blocks.length - 1];
      if (last && last.type === 'list') last.items!.push(item);
      else blocks.push({ type: 'list', items: [item] });
      continue;
    }
    // 有序列表 1. xxx（数字+点）
    if (/^\d+[.)]\s+/.test(line.trim())) {
      flushPara();
      const item = line.trim().replace(/^\d+[.)]\s+/, '');
      const last = blocks[blocks.length - 1];
      if (last && last.type === 'list') last.items!.push(item);
      else blocks.push({ type: 'list', items: [item] });
      continue;
    }
    // 空行：段落分隔
    if (line.trim() === '') {
      flushPara();
      continue;
    }
    para.push(line);
  }
  flushPara();
  return blocks;
}

/** 追问回答 markdown 渲染（华彩风格） */
export function AskMarkdown({ content }: { content: string }) {
  const blocks = parseBlocks(content);
  return (
    <div className="space-y-2.5">
      {blocks.map((b, i) => {
        if (b.type === 'heading') {
          // 标题：衬线黛青 + 左琥珀金线（呼应 InterpretPanel 子主题卡片）
          return (
            <div key={i} className="flex items-center gap-2 pt-1">
              <span className="w-1 h-4 bg-hu-po-jin rounded-full shrink-0" />
              <span className="font-serif-display text-dai-qing-dark text-sm tracking-wide">
                <Inline text={b.text!} />
              </span>
            </div>
          );
        }
        if (b.type === 'list') {
          return (
            <ul key={i} className="space-y-1 pl-1">
              {b.items!.map((item, j) => (
                <li key={j} className="flex gap-2 text-sm text-dai-qing leading-relaxed">
                  <span className="text-hu-po-jin mt-0.5 shrink-0">·</span>
                  <span>
                    <Inline text={item} />
                  </span>
                </li>
              ))}
            </ul>
          );
        }
        // 段落
        return (
          <p key={i} className="text-sm text-dai-qing leading-relaxed">
            <Inline text={b.text!} />
          </p>
        );
      })}
    </div>
  );
}
