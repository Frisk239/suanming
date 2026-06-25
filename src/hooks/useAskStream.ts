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
  // 失败时可重试的最后一问（网络抖动时用户可重发，对齐 InterpretPanel 重试体验）
  const [retryable, setRetryable] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 移除末尾空的 assistant 占位气泡（失败重试/清理用）
  const trimEmptyAssistant = useCallback(() => {
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last && last.role === 'assistant' && !last.content) next.pop();
      return next;
    });
  }, []);

  const ask = useCallback(
    async (profileId: string, message: string) => {
      // 立即显示用户消息 + 占位 AI 气泡（流式追加）
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: message },
        { role: 'assistant', content: '' },
      ]);
      setError('');
      setNeedsAuth(false);
      setRetryable('');
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
              trimEmptyAssistant();
            } else {
              setError(e);
              // 失败：清空气泡占位，记住问题供重试
              trimEmptyAssistant();
              setRetryable(message);
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
          // fetch 级失败（如网络断开）：清空气泡，记问题供重试
          trimEmptyAssistant();
          setRetryable(message);
          setError(e instanceof Error ? e.message : '追问失败');
          setStreaming(false);
        }
      }
    },
    [trimEmptyAssistant],
  );

  /** 重试上次失败的追问（用同一 profileId + 同一问题） */
  const retry = useCallback(
    (profileId: string) => {
      if (!retryable || streaming) return;
      ask(profileId, retryable);
    },
    [retryable, streaming, ask],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
  }, []);

  return { messages, streaming, error, needsAuth, retryable, ask, retry, stop, setMessages };
}
