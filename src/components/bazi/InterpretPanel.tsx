// src/components/bazi/InterpretPanel.tsx
// ③层 AI 详批面板（spec 5.7）。SSE 流式渲染四段式长文。
// 人格（学者/隐士）+ 深度（专业/通俗）下拉，切换后重新请求。
// 四段【依据】【推演】【结论】【边界】分段着色渲染。

'use client';

import { useState, useEffect } from 'react';
import { useInterpretStream } from '@/hooks/useInterpretStream';
import type { ChartInput } from '@/types/bazi';
import type { InterpretOptions } from '@/types/ui';

interface Props {
  /** 排盘入参（详批后端内部自行排盘+解读+检索） */
  input: ChartInput;
}

// 四段式标记（spec 4.5 prompt 要求 LLM 输出【依据】【推演】【结论】【边界】）
const SEGMENTS = [
  { tag: '依据', label: '依据 · 格局用神', desc: '本盘核心格局/用神/病灶（引古籍）' },
  { tag: '推演', label: '推演 · 命理逻辑', desc: '从依据到结论的逻辑链' },
  { tag: '结论', label: '结论 · 分项论断', desc: '事业/财运/婚姻/健康' },
  { tag: '边界', label: '边界 · 不确定项', desc: '不确定项 + 文化研究声明' },
] as const;

/**
 * 把流式文本按四段 markdown 标题分段。后端 prompt.ts:34 要求 LLM 输出
 * 「## 依据」「## 推演」「## 结论」「## 边界」（实测 LLM 忠实输出此格式）。
 * 未匹配段归入「正文」（如首个标记前的导语）。
 */
function segment(text: string): { tag: string | null; body: string }[] {
  // 匹配整段标题行：## + 标记词 + 换行。headerStart/End 用于切分。
  const re = /(?:^|\n)(##\s*)(依据|推演|结论|边界)\s*\n/g;
  const marks: { tag: string; headerStart: number; headerEnd: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    // 若 \n 开头，header 从 ## 开始（换行保留在前段）
    const headerStart = m.index + (text[m.index] === '\n' ? 1 : 0);
    marks.push({ tag: m[2], headerStart, headerEnd: m.index + m[0].length });
  }
  if (marks.length === 0) {
    return [{ tag: null, body: text.trim() }];
  }
  const result: { tag: string | null; body: string }[] = [];
  const lead = text.slice(0, marks[0].headerStart).trim();
  if (lead) result.push({ tag: null, body: lead });
  for (let i = 0; i < marks.length; i++) {
    const start = marks[i].headerEnd;
    const end = i + 1 < marks.length ? marks[i + 1].headerStart : text.length;
    result.push({ tag: marks[i].tag, body: text.slice(start, end).trim() });
  }
  return result;
}

const SEG_STYLE: Record<string, string> = {
  依据: 'border-accent',
  推演: 'border-ink-300',
  结论: 'border-accent-deep',
  边界: 'border-wx-huo',
};

/**
 * 最小富文本渲染：只处理 **bold**（spec 5.1 不引 UI/markdown 库，自绘够用）。
 * 其余原样（列表 -、《》等纯文本可读）。按 ** 分割成交替的 normal/bold 片段。
 */
function RichText({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g); // 奇数索引 = bold
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-ink-900">
            {p}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export function InterpretPanel({ input }: Props) {
  const [options, setOptions] = useState<InterpretOptions>({
    persona: 'scholar',
    depth: 'standard',
  });
  const { content, streaming, error, start, stop, reset } = useInterpretStream();
  const [started, setStarted] = useState(false);

  // 切换人格/深度时，若已开始过则重新生成（spec 5.7）
  useEffect(() => {
    if (started) {
      start(input, options);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.persona, options.depth]);

  const begin = () => {
    setStarted(true);
    start(input, options);
  };

  const segments = segment(content);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-ink-100 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h3 className="font-serif-display text-lg text-ink-900 tracking-widest">
          AI 详批
        </h3>
        <div className="flex gap-2 text-sm">
          <select
            className="input"
            value={options.persona}
            onChange={(e) =>
              setOptions((o) => ({ ...o, persona: e.target.value as 'scholar' | 'hermit' }))
            }
          >
            <option value="scholar">严谨学者</option>
            <option value="hermit">幽默隐士</option>
          </select>
          <select
            className="input"
            value={options.depth}
            onChange={(e) =>
              setOptions((o) => ({ ...o, depth: e.target.value as 'standard' | 'popular' }))
            }
          >
            <option value="standard">专业级</option>
            <option value="popular">通俗级</option>
          </select>
        </div>
      </div>

      {!started && (
        <button
          onClick={begin}
          className="w-full py-2 bg-accent text-white rounded font-serif-display tracking-widest hover:bg-accent-deep transition-colors"
        >
          开始 AI 详批
        </button>
      )}

      {started && (
        <>
          <div className="flex items-center gap-3 mb-3">
            {streaming ? (
              <button onClick={stop} className="text-sm text-ink-500 hover:text-ink-700">
                ■ 停止生成
              </button>
            ) : (
              <button
                onClick={() => start(input, options)}
                className="text-sm text-accent hover:text-accent-deep"
              >
                ↻ 重新生成
              </button>
            )}
            <button onClick={reset} className="text-sm text-ink-300 hover:text-ink-500">
              清空
            </button>
          </div>

          {error && (
            <p className="text-wx-huo text-sm mb-3 p-2 bg-wx-huo/5 rounded">
              ⚠ {error}
            </p>
          )}

          {/* 四段式渲染 */}
          <div className="space-y-3">
            {segments.map((seg, i) => {
              const meta = SEGMENTS.find((s) => s.tag === seg.tag);
              if (!seg.tag || !meta) {
                // 正文（前导或未分段）
                if (!seg.body) return null;
                return (
                  <p key={i} className="text-sm text-ink-700 whitespace-pre-wrap leading-relaxed">
                    <RichText text={seg.body} />
                  </p>
                );
              }
              return (
                <div key={i} className={`border-l-2 pl-3 ${SEG_STYLE[seg.tag] ?? ''}`}>
                  <div className="font-serif-display text-ink-900 text-sm">{meta.label}</div>
                  <div className="text-xs text-ink-300 mb-1">{meta.desc}</div>
                  <p className="text-sm text-ink-700 whitespace-pre-wrap leading-relaxed">
                    <RichText text={seg.body} />
                    {/* 末段流式中显示光标 */}
                    {streaming && i === segments.length - 1 && (
                      <span className="animate-pulse text-accent">▌</span>
                    )}
                  </p>
                </div>
              );
            })}
            {/* 完全空内容时（刚开始）显示等待 */}
            {!content && streaming && !error && (
              <p className="text-sm text-ink-300">正在检索古籍、组织详批…</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
