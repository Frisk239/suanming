// src/lib/rag/embedder.ts
// BGE-M3 embedding 的 HTTP 客户端。
//
// 实际推理在 Python 微服务（scripts/embed-server.py，FastAPI + GPU，本地常驻）。
// 这样建库和查询用同一模型同一实现，向量空间完全一致
// （之前 ONNX/PyTorch 不一致，余弦仅 0.775；统一后 >0.999）。
//
// 微服务地址由 EMBED_URL 配置（默认 http://127.0.0.1:8765）。
// localhost 调用不走代理（不调 setupProxy）；靠 .env.local 的 NO_PROXY=localhost,127.0.0.1
// 防止 undici 全局代理拦截。生产（Vercel）调 Railway 上的微服务，HTTPS_PROXY 留空。

const EMBED_URL = process.env.EMBED_URL ?? 'http://127.0.0.1:8765';

/** 单条文本 → 1024 维归一化向量 */
export async function embed(text: string): Promise<number[]> {
  const resp = await fetch(`${EMBED_URL}/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    throw new Error(`embed 服务返回 ${resp.status}: ${detail}`);
  }
  const data = (await resp.json()) as { embedding: number[] };
  return data.embedding;
}

/** 批量 embedding（建库用；微服务内部分批 encode 防 OOM） */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const resp = await fetch(`${EMBED_URL}/embed-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts }),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    throw new Error(`embed-batch 服务返回 ${resp.status}: ${detail}`);
  }
  const data = (await resp.json()) as { embeddings: number[][] };
  return data.embeddings;
}
