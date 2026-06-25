// src/components/bazi/InterpretPanel.tsx
// ③层 AI 详批面板（spec 5.7）。SSE 流式渲染五段式长文。
// 人格（学者/隐士）+ 深度（专业/通俗）下拉，切换后重新请求。
// 四个二级段【依据】【推演】【结论】【边界】分段着色渲染；
// 结论段内含五个 ### 主题子卡片（事业/财运/婚姻/健康/家人六亲，2026-06-24 颗粒度细化）。

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useInterpretStream } from '@/hooks/useInterpretStream';
import { useSession } from '@/components/auth/SessionProvider';
import { AskPanel } from './AskPanel';
import type { ChartInput } from '@/types/bazi';
import type { InterpretOptions } from '@/types/ui';

interface Props {
  /** 排盘入参（详批后端内部自行排盘+解读+检索） */
  input: ChartInput;
  /** M7：登录用户排盘建的 birth_profile id（追问用）。未登录为空则不显示追问 */
  profileId?: string;
}

// 二级段元信息（prompt.ts 的 ## 标题）。结论段 desc 列五主题。
const SEGMENTS = [
  { tag: '依据', label: '依据 · 格局用神', desc: '本盘核心格局/用神/病灶（引古籍）' },
  { tag: '推演', label: '推演 · 命理逻辑', desc: '从依据到结论的逻辑链' },
  { tag: '结论', label: '结论 · 五主题深入', desc: '事业 / 财运 / 婚姻感情 / 健康 / 家人六亲' },
  { tag: '边界', label: '边界 · 不确定项', desc: '不确定项 + 文化研究声明' },
] as const;

// 结论段内 ### 三级主题的颜色点缀（让五个主题卡片有区分度）
const SUB_THEME_STYLE: Record<string, string> = {
  事业: 'border-dai-qing-light',
  财运: 'border-wx-tu',
  婚姻感情: 'border-wx-huo',
  健康: 'border-wx-mu',
  家人六亲: 'border-wx-jin',
};

/** 一个段：tag 是二级段名（依据/推演/结论/边界）；结论段的 sub 是 ### 主题子段 */
interface Segment {
  tag: string | null;
  body: string;
  /** 仅结论段：### 三级标题拆出的主题子段（事业/财运/...） */
  sub?: { tag: string; body: string }[];
}

/**
 * 把流式文本按 ## 二级标题切四个段（依据/推演/结论/边界）。
 * 结论段内部再按 ### 三级标题拆成主题子段（事业/财运/婚姻/健康/家人六亲）。
 * 后端 prompt.ts 要求 LLM 用 markdown 标题输出（实测忠实执行）。
 */
function segment(text: string): Segment[] {
  // 1) 先按 ## 二级标题切四段
  const re = /(?:^|\n)(##\s*)(依据|推演|结论|边界)\s*\n/g;
  const marks: { tag: string; headerStart: number; headerEnd: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const headerStart = m.index + (text[m.index] === '\n' ? 1 : 0);
    marks.push({ tag: m[2], headerStart, headerEnd: m.index + m[0].length });
  }
  if (marks.length === 0) {
    return [{ tag: null, body: text.trim() }];
  }
  const result: Segment[] = [];
  const lead = text.slice(0, marks[0].headerStart).trim();
  if (lead) result.push({ tag: null, body: lead });
  for (let i = 0; i < marks.length; i++) {
    const start = marks[i].headerEnd;
    const end = i + 1 < marks.length ? marks[i + 1].headerStart : text.length;
    const segBody = text.slice(start, end).trim();
    const seg: Segment = { tag: marks[i].tag, body: segBody };
    // 2) 结论段：内部按 ### 三级标题拆主题子段
    if (seg.tag === '结论') {
      seg.sub = splitSubthemes(segBody);
    }
    result.push(seg);
  }
  return result;
}

/** 把结论段正文按 ### 三级标题拆成主题子段。无 ### 时返回空数组（整段当一个块）。 */
function splitSubthemes(body: string): { tag: string; body: string }[] {
  const re = /(?:^|\n)(###\s*)([^\n]+?)\s*\n/g;
  const marks: { tag: string; headerStart: number; headerEnd: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const headerStart = m.index + (body[m.index] === '\n' ? 1 : 0);
    marks.push({ tag: m[2].trim(), headerStart, headerEnd: m.index + m[0].length });
  }
  if (marks.length === 0) return [];
  const subs: { tag: string; body: string }[] = [];
  const lead = body.slice(0, marks[0].headerStart).trim();
  if (lead) subs.push({ tag: '', body: lead }); // 主题前的导语（如"以下分主题展开"）
  for (let i = 0; i < marks.length; i++) {
    const start = marks[i].headerEnd;
    const end = i + 1 < marks.length ? marks[i + 1].headerStart : body.length;
    subs.push({ tag: marks[i].tag, body: body.slice(start, end).trim() });
  }
  return subs;
}

const SEG_STYLE: Record<string, string> = {
  依据: 'border-hu-po-jin',
  推演: 'border-dai-qing-light',
  结论: 'border-hu-po-jin-dark',
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
          <strong key={i} className="font-semibold text-dai-qing-dark">
            {p}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export function InterpretPanel({ input, profileId }: Props) {
  const { user } = useSession();
  const [options, setOptions] = useState<InterpretOptions>({
    persona: 'scholar',
    depth: 'standard',
  });
  const { content, streaming, error, start, stop, reset } = useInterpretStream();
  const [started, setStarted] = useState(false);

  // 详批门槛（spec 5.3，M5）：未登录 → 登录引导；401 NEEDS_AUTH 错误 → 同样引导。
  // 排盘/规则解读（①②层）免费，AI 详批（③层）需登录。
  const needsAuth = !user || (!!error && error.startsWith('__NEEDS_AUTH__:'));

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

  // 未登录：展示「登录后详批」引导，不渲染详批控件
  if (needsAuth) {
    return (
      <div className="rounded-lg border border-dai-qing-light/30 bg-dai-qing-dark/60 backdrop-blur p-6 text-center">
        <div className="font-serif-display text-lg text-xuan-zhi tracking-widest mb-2">
          AI 详批
        </div>
        <p className="text-sm text-xuan-zhi/50 mb-5 leading-relaxed">
          排盘与规则解读免费开放；AI 逐句详批需登录后使用。
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-2 bg-hu-po-jin text-dai-qing-dark rounded font-serif-display tracking-widest hover:bg-hu-po-jin-light transition-colors text-sm"
        >
          登录后详批
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dai-qing/15 bg-xuan-zhi shadow-sm p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h3 className="font-serif-display text-lg text-dai-qing-dark tracking-widest">
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
          className="qn-sheen-sweep relative overflow-hidden w-full py-2 bg-hu-po-jin text-dai-qing-dark rounded font-serif-display tracking-widest hover:bg-hu-po-jin-light transition-colors"
        >
          开始 AI 详批
        </button>
      )}

      {started && (
        <>
          <div className="flex items-center gap-3 mb-3">
            {streaming ? (
              <button onClick={stop} className="text-sm text-dai-qing/60 hover:text-dai-qing">
                ■ 停止生成
              </button>
            ) : (
              <button
                onClick={() => start(input, options)}
                className="text-sm text-hu-po-jin hover:text-hu-po-jin-dark"
              >
                ↻ 重新生成
              </button>
            )}
            <button onClick={reset} className="text-sm text-dai-qing/40 hover:text-dai-qing/70">
              清空
            </button>
          </div>

          {error && (
            <p className="text-wx-huo text-sm mb-3 p-2 bg-wx-huo/5 rounded">
              ⚠ {error}
            </p>
          )}

          {/* 五段式渲染（结论段含 ### 主题子卡片） */}
          <div className="space-y-3">
            {segments.map((seg, i) => {
              const meta = SEGMENTS.find((s) => s.tag === seg.tag);
              const isLast = i === segments.length - 1;
              // 正文（前导或未分段）
              if (!seg.tag || !meta) {
                if (!seg.body) return null;
                return (
                  <p key={i} className="text-sm text-dai-qing whitespace-pre-wrap leading-relaxed">
                    <RichText text={seg.body} />
                  </p>
                );
              }
              // 结论段：若有 ### 子主题，渲染成主题子卡片列表
              if (seg.tag === '结论' && seg.sub && seg.sub.length > 0) {
                return (
                  <div key={i} className={`border-l-2 pl-3 ${SEG_STYLE[seg.tag] ?? ''}`}>
                    <div className="font-serif-display text-dai-qing-dark text-sm">{meta.label}</div>
                    <div className="text-xs text-dai-qing/50 mb-2">{meta.desc}</div>
                    <div className="space-y-3">
                      {seg.sub.map((sub, si) => {
                        const isLastSub = isLast && si === seg.sub!.length - 1;
                        const hasTag = sub.tag.length > 0;
                        return (
                          <div
                            key={si}
                            className={`pl-2 ${hasTag ? `border-l-2 ${SUB_THEME_STYLE[sub.tag] ?? 'border-dai-qing-light'}` : ''}`}
                          >
                            {hasTag && (
                              <div className="font-serif-display text-dai-qing-dark text-sm mb-0.5">
                                {sub.tag}
                              </div>
                            )}
                            <p className="text-sm text-dai-qing whitespace-pre-wrap leading-relaxed">
                              <RichText text={sub.body} />
                              {/* 流式中：最后一个子段末尾显示光标 */}
                              {streaming && isLastSub && (
                                <span className="animate-pulse text-hu-po-jin">▌</span>
                              )}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              // 依据/推演/边界（普通段，无子主题）
              return (
                <div key={i} className={`border-l-2 pl-3 ${SEG_STYLE[seg.tag] ?? ''}`}>
                  <div className="font-serif-display text-dai-qing-dark text-sm">{meta.label}</div>
                  <div className="text-xs text-dai-qing/50 mb-1">{meta.desc}</div>
                  <p className="text-sm text-dai-qing whitespace-pre-wrap leading-relaxed">
                    <RichText text={seg.body} />
                    {/* 末段流式中显示光标 */}
                    {streaming && isLast && (
                      <span className="animate-pulse text-hu-po-jin">▌</span>
                    )}
                  </p>
                </div>
              );
            })}
            {/* 完全空内容时（刚开始）显示等待 */}
            {!content && streaming && !error && (
              <p className="text-sm text-dai-qing/40">正在检索古籍、组织详批…</p>
            )}
          </div>
        </>
      )}

      {/* M7：解读完成后嵌入追问区（登录且有 profileId 才显示） */}
      {!streaming && content && profileId && <AskPanel profileId={profileId} />}
    </div>
  );
}
