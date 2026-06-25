// src/components/bazi/AskPanel.tsx
// 追问对话区（M7）。解读完后自动展开，嵌在 InterpretPanel 下方。
//
// 华彩风格（spec 七）：
//   用户气泡黛青底 + 玄纸字；AI 气泡玄纸暖底 + 琥珀金 accent + 黛青字。
//   视觉与解读全文（卡片式长文）区分但同模块（同华彩调色板）。
//
// 未登录降级：profileId 为空时不渲染（InterpretPanel 已有登录门槛）；
//   追问过程中 session 过期 → needsAuth，展示登录引导（转化钩子）。

'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAskStream } from '@/hooks/useAskStream';

interface Props {
  profileId: string;
}

export function AskPanel({ profileId }: Props) {
  const { messages, streaming, error, needsAuth, ask, stop } = useAskStream();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // 新消息自动滚到底
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    if (!input.trim() || streaming) return;
    ask(profileId, input.trim());
    setInput('');
  };

  // session 过期降级（追问中 session 失效）
  if (needsAuth) {
    return (
      <div className="mt-6 border-t border-dai-qing/15 pt-4">
        <div className="font-serif-display text-sm text-dai-qing-dark tracking-widest mb-3">
          继续追问
        </div>
        <div className="rounded-lg border border-dai-qing-light/30 bg-dai-qing-dark/60 p-4 text-center">
          <p className="text-sm text-xuan-zhi/70 mb-3">登录后可继续追问命盘细节</p>
          <Link
            href="/login"
            className="inline-block px-5 py-1.5 bg-hu-po-jin text-dai-qing-dark rounded font-serif-display tracking-widest hover:bg-hu-po-jin-light transition-colors text-sm"
          >
            去登录
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 border-t border-dai-qing/15 pt-4">
      <div className="font-serif-display text-sm text-dai-qing-dark tracking-widest mb-3">
        继续追问
      </div>

      {/* 对话气泡列表 */}
      <div ref={scrollRef} className="space-y-3 max-h-96 overflow-y-auto mb-3 pr-1">
        {messages.map((m, i) => {
          const isLastAssistant =
            m.role === 'assistant' && i === messages.length - 1 && streaming;
          return (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-dai-qing text-xuan-zhi'
                    : 'bg-xuan-zhi-warm border border-hu-po-jin/20 text-dai-qing'
                }`}
              >
                {m.content}
                {isLastAssistant && <span className="animate-pulse text-hu-po-jin">▌</span>}
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <p className="text-xs text-dai-qing/40 text-center py-4 leading-relaxed">
            对命盘有任何疑问，可直接追问
            <br />
            <span className="text-dai-qing/30">如「事业哪年有转机」「健康要注意什么」</span>
          </p>
        )}
      </div>

      {error && <p className="text-wx-huo text-xs mb-2">⚠ {error}</p>}

      {/* 输入区 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="输入追问…"
          disabled={streaming}
          className="input flex-1"
        />
        {streaming ? (
          <button
            onClick={stop}
            className="px-4 py-1.5 text-sm text-dai-qing/60 hover:text-dai-qing"
          >
            ■ 停止
          </button>
        ) : (
          <button
            onClick={send}
            className="px-4 py-1.5 bg-hu-po-jin text-dai-qing-dark rounded text-sm font-serif-display tracking-widest hover:bg-hu-po-jin-light transition-colors"
          >
            发送
          </button>
        )}
      </div>
    </div>
  );
}
