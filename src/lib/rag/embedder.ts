// src/lib/rag/embedder.ts
// BGE-M3 embedding 客户端。双格式适配（spec 4.2）：
//   - 无 EMBED_API_KEY：本地微服务（POST {EMBED_URL}/embed body {text} → {embedding}）
//   - 有 EMBED_API_KEY：外部 API（DeepInfra，OpenAI 格式 POST {EMBED_URL} body {model,input} Bearer → {data:[{embedding}]})
// 切换只需配 env，不改代码。建库和查询必须同一路径（向量空间一致）。
//
// 注：env 逐次读取（非模块级常量），保证运行时切换 env 生效（如测试中动态设 env）。

/** 读 EMBED_API_KEY：有=外部 API（DeepInfra），无=本地微服务 */
function apiKey(): string | undefined {
  return process.env.EMBED_API_KEY;
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const key = apiKey();
  if (key) h.Authorization = `Bearer ${key}`;
  return h;
}

/** 单条文本 → 1024 维归一化向量 */
export async function embed(text: string): Promise<number[]> {
  const url = process.env.EMBED_URL ?? 'http://127.0.0.1:8765';
  const model = process.env.EMBED_MODEL ?? 'BAAI/bge-m3';
  const key = apiKey();
  const resp = await fetch(`${url}${key ? '' : '/embed'}`, {
    method: 'POST',
    headers: headers(),
    body: key
      ? JSON.stringify({ model, input: [text] })
      : JSON.stringify({ text }),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    throw new Error(`embed 服务返回 ${resp.status}: ${detail}`);
  }
  const data = (await resp.json()) as { embedding?: number[]; data?: { embedding: number[] }[] };
  return key ? (data.data?.[0]?.embedding ?? []) : (data.embedding ?? []);
}

/** 批量 embedding（建库用） */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const url = process.env.EMBED_URL ?? 'http://127.0.0.1:8765';
  const model = process.env.EMBED_MODEL ?? 'BAAI/bge-m3';
  const key = apiKey();
  const resp = await fetch(`${url}${key ? '' : '/embed-batch'}`, {
    method: 'POST',
    headers: headers(),
    body: key
      ? JSON.stringify({ model, input: texts })
      : JSON.stringify({ texts }),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    throw new Error(`embed-batch 服务返回 ${resp.status}: ${detail}`);
  }
  const data = (await resp.json()) as {
    embeddings?: number[][];
    data?: { embedding: number[] }[];
  };
  return key
    ? (data.data?.map((d) => d.embedding) ?? [])
    : (data.embeddings ?? []);
}
