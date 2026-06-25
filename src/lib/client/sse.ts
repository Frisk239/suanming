// src/lib/client/sse.ts
// 公共 SSE 流解析（M7 抽出，interpret/ask 复用）。
// fetch POST + ReadableStream + TextDecoder 解析 data: {...} + [DONE]。
//
// 帧格式（后端 interpret/ask 一致）：
//   data: {"token":"..."}\n\n   每个 LLM token
//   data: {"error":"..."}\n\n   流中途错误
//   data: [DONE]\n\n            流结束

export interface SSECallbacks {
  onToken: (t: string) => void;
  onError?: (e: string) => void;
  onDone: () => void;
}

/**
 * 消费 SSE 流。resp 是已发起的 fetch 响应。
 * 非 2xx 或无 body 时解析 {error} 回调 onError。
 * 401 特殊处理：401 返回的 error 带 __NEEDS_AUTH__: 前缀（供前端展示登录引导）。
 */
export async function parseSSEStream(resp: Response, cb: SSECallbacks): Promise<void> {
  if (!resp.ok || !resp.body) {
    const e = await resp.json().catch(() => ({}));
    const msg = e.error ?? `请求失败 ${resp.status}`;
    // 401 加标记，前端据此展示登录引导而非普通错误
    cb.onError?.(resp.status === 401 ? `__NEEDS_AUTH__:${msg}` : msg);
    return;
  }
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? ''; // 最后一段可能不完整，留作下次
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === '[DONE]') {
        cb.onDone();
        return;
      }
      try {
        const obj = JSON.parse(payload) as { token?: string; error?: string };
        if (obj.token) cb.onToken(obj.token);
        if (obj.error) cb.onError?.(obj.error);
      } catch {
        // 非 JSON 帧跳过（如 SSE 注释行）
      }
    }
  }
  // 流自然结束（无显式 [DONE]）也视为完成
  cb.onDone();
}
