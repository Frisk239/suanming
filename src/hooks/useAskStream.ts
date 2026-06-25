// src/hooks/useAskStream.ts
// 追问 SSE 流式 hook（M7）。消费 /api/bazi/ask。
// 与 useInterpretStream 平行，但状态是对话消息列表（多轮），入参是 profileId + message。
//
// 未登录处理：ask 返回 401 带 __NEEDS_AUTH__: 前缀，AskPanel 据此展示登录引导。

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { parseSSEStream } from '@/lib/client/sse';

export interface AskMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function useAskStream() {
  const [messages, setMessages] = useState<AskMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  // 未登录标记（ask 401 时置 true，供 AskPanel 展示登录引导）
  const [needsAuth, setNeedsAuth] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const ask = useCallback(async (profileId: string, message: string) => {
    // 立即显示用户消息 + 占位 AI 气泡（流式追加）
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: message },
      { role: 'assistant', content: '' },
    ]);
    setError('');
    setNeedsAuth(false);
    setStreaming(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const resp = await fetch('/api/bazi/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, message }),
        signal: ctrl.signal,
      });
      await parseSSEStream(resp, {
        onToken: (t) => {
          if (!mountedRef.current) return;
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === 'assistant') {
              next[next.length - 1] = { ...last, content: last.content + t };
            }
            return next;
          });
        },
        onError: (e) => {
          if (!mountedRef.current) return;
          if (e.startsWith('__NEEDS_AUTH__:')) {
            setNeedsAuth(true);
            // 移除占位的空 AI 气泡
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last && last.role === 'assistant' && !last.content) next.pop();
              return next;
            });
          } else {
            setError(e);
          }
        },
        onDone: () => {
          if (mountedRef.current) setStreaming(false);
        },
      });
    } catch (e) {
      if (ctrl.signal.aborted) {
        if (mountedRef.current) setStreaming(false);
      } else if (mountedRef.current) {
        setError(e instanceof Error ? e.message : '追问失败');
        setStreaming(false);
      }
    }
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
  }, []);

  return { messages, streaming, error, needsAuth, ask, stop, setMessages };
}
