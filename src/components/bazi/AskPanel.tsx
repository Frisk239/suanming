// src/components/bazi/AskPanel.tsx
// 追问对话区（M7）。解读完后自动展开，嵌在 InterpretPanel（玄纸暖浅底）下方。
//
// 设计参考：thefrontkit AI Chat UI Best Practices + 华彩设计语言（globals.css）。
// 与 InterpretPanel 同源——AI 回答用"古卷卡片"质感（玄纸暖底 + 琥珀金左线，
// 呼应 InterpretPanel 的 border-l 段落），用户提问用黛青底右对齐。
// 区分维度（最佳实践：颜色+对齐+角色标识多重）：AI 左对齐带"青囊"金标，
// 用户右对齐无标，色块互补。
//
// 未登录降级：profileId 为空不渲染；session 过期 needsAuth → 登录引导（转化钩子）。

'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAskStream } from '@/hooks/useAskStream';
import { AskMarkdown } from './AskMarkdown';

interface Props {
  profileId: string;
}

// 引导示例问题（空状态展示，点击直接发送）
const SUGGESTIONS = ['事业哪年有转机', '财运要注意什么', '婚姻感情如何', '健康要留意什么'];

export function AskPanel({ profileId }: Props) {
  const { messages, streaming, error, needsAuth, retryable, ask, retry, stop } = useAskStream();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // 新消息自动滚到底
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = (text: string) => {
    const q = text.trim();
    if (!q || streaming) return;
    ask(profileId, q);
    setInput('');
  };

  // session 过期降级（追问中 session 失效）
  if (needsAuth) {
    return (
      <div className="mt-6 border-t border-dai-qing/15 pt-5">
        <SectionTitle />
        <div className="rounded-lg border border-dai-qing-light/40 bg-dai-qing-dark p-5 text-center">
          <div className="font-serif-display text-base text-hu-po-jin tracking-widest mb-2">
            继续追问
          </div>
          <p className="text-sm text-xuan-zhi/60 mb-4 leading-relaxed">
            登录后可就命盘细节继续追问青囊
          </p>
          <Link
            href="/login"
            className="inline-block px-6 py-2 bg-hu-po-jin text-dai-qing-dark rounded font-serif-display tracking-widest hover:bg-hu-po-jin-light transition-colors text-sm"
          >
            去登录
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 border-t border-dai-qing/15 pt-5">
      <SectionTitle />

      {/* 对话列表 */}
      <div ref={scrollRef} className="space-y-4 max-h-[28rem] overflow-y-auto mb-4 pr-1">
        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} content={m.content} streaming={streaming && i === messages.length - 1} />
        ))}

        {/* 空状态：朱砂印 + 引导示例（点击即问） */}
        {messages.length === 0 && (
          <div className="py-4">
            <div className="flex items-center justify-center gap-2 mb-5">
              <span
                className="inline-flex items-center justify-center w-9 h-9 rounded font-serif-display text-xuan-zhi text-sm"
                style={{ background: 'var(--seal-red)' }}
                aria-hidden
              >
                青囊
              </span>
            </div>
            <p className="text-sm text-dai-qing/60 text-center mb-1 leading-relaxed">
              详批已毕，可就命盘继续追问
            </p>
            <p className="text-xs text-dai-qing/35 text-center mb-5">
              青囊将基于你的格局用神与古籍原文作答
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="px-3 py-1.5 text-xs text-dai-qing border border-hu-po-jin/30 rounded-full hover:border-hu-po-jin hover:bg-hu-po-jin/5 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 mb-2 px-1">
          <p className="text-vermillion text-xs">⚠ {error}</p>
          {retryable && !streaming && (
            <button
              onClick={() => retry(profileId)}
              className="text-xs text-hu-po-jin hover:text-hu-po-jin-dark transition-colors"
            >
              ↻ 重试
            </button>
          )}
        </div>
      )}

      {/* 输入区：玄纸暖浅底适配（非深底 .input 类） */}
      <div className="flex gap-2 items-stretch">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(input)}
          placeholder="输入追问…"
          disabled={streaming}
          className="flex-1 px-3 py-2 text-sm bg-xuan-zhi-warm border border-dai-qing-light/40 rounded text-dai-qing-dark placeholder:text-dai-qing/30 focus:outline-none focus:border-hu-po-jin transition-colors disabled:opacity-60"
        />
        {streaming ? (
          <button
            onClick={stop}
            className="px-4 text-sm text-dai-qing/50 hover:text-dai-qing transition-colors"
          >
            ■ 停止
          </button>
        ) : (
          <button
            onClick={() => send(input)}
            disabled={!input.trim()}
            className="px-5 py-2 bg-hu-po-jin text-dai-qing-dark rounded text-sm font-serif-display tracking-widest hover:bg-hu-po-jin-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            发送
          </button>
        )}
      </div>
    </div>
  );
}

/** 小节标题：衬线金 + 分隔点（呼应 InterpretPanel 的段落标题风格） */
function SectionTitle() {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="font-serif-display text-sm text-dai-qing-dark tracking-widest">
        继续追问
      </span>
      <span className="h-px flex-1 bg-gradient-to-r from-hu-po-jin/40 to-transparent" />
    </div>
  );
}

/** 单条消息气泡：AI 用古卷卡片（左线+金标），用户用黛青底右对齐 */
function MessageBubble({
  role,
  content,
  streaming,
}: {
  role: 'user' | 'assistant';
  content: string;
  streaming: boolean;
}) {
  if (role === 'assistant') {
    // AI：玄纸暖底古卷卡片，左琥珀金线 + "青囊"角色标（呼应 InterpretPanel 段落）
    return (
      <div className="flex justify-start">
        <div className="max-w-[88%]">
          <div className="flex items-center gap-1.5 mb-1 ml-1">
            <span className="font-serif-display text-xs text-hu-po-jin tracking-wider">青囊</span>
          </div>
          <div className="rounded-r-lg rounded-tl-lg border-l-2 border-hu-po-jin bg-xuan-zhi-warm border border-hu-po-jin/15 px-4 py-2.5 text-dai-qing-dark leading-relaxed shadow-sm">
            <AskMarkdown content={content} />
            {streaming && <span className="animate-pulse text-hu-po-jin font-bold">▌</span>}
          </div>
        </div>
      </div>
    );
  }
  // 用户：黛青底右对齐，玄纸字，无角色标
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-l-lg rounded-tr-lg bg-dai-qing px-4 py-2.5 text-sm text-xuan-zhi whitespace-pre-wrap leading-relaxed">
        {content}
      </div>
    </div>
  );
}
