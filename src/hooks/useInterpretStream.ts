// src/hooks/useInterpretStream.ts
// interpret SSE 流式消费 hook（spec 5.7）。自建 fetch+ReadableStream+AbortController
// （mingyu 无流式可参考）。封装③层 interpret 的 token 增量、错误、停止、重置。
//
// 注：401 未登录错误以 __NEEDS_AUTH__: 前缀原样透传到 error（api.ts 加的标记），
// InterpretPanel 据此展示登录引导而非普通错误。

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { streamInterpret } from '@/lib/client/api';
import type { ChartInput } from '@/types/bazi';
import type { InterpretOptions } from '@/types/ui';

export function useInterpretStream() {
  const [content, setContent] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  // 组件卸载后不再 setState（避免 abort 后的 token 回调警告）
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const start = useCallback(async (input: ChartInput, options: InterpretOptions, useCache = true) => {
    setContent('');
    setError('');
    setStreaming(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      await streamInterpret(input, options, {
        onToken: (t) => {
          if (mountedRef.current) setContent((c) => c + t);
        },
        onError: (e) => {
          if (mountedRef.current) setError(e);
        },
        onDone: () => {
          if (mountedRef.current) setStreaming(false);
        },
        signal: ctrl.signal,
      }, useCache);
    } catch (e) {
      // abort 会抛 AbortError，属正常停止，不视为错误
      if (ctrl.signal.aborted) {
        if (mountedRef.current) setStreaming(false);
      } else if (mountedRef.current) {
        setError(e instanceof Error ? e.message : '详批失败');
        setStreaming(false);
      }
    }
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setContent('');
    setError('');
    setStreaming(false);
  }, []);

  return { content, streaming, error, start, stop, reset };
}
