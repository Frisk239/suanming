// src/lib/rag/embedder.ts
// 本地 BGE-M3 embedding（@huggingface/transformers v3）。
// v3 起包名从 @xenova/transformers 更名为 @huggingface/transformers（API 兼容）。
// 模型 repo 仍为 'Xenova/bge-m3'（HF Hub 上模型 id 未变，只是 npm 包改名）。
//
// 首次运行自动下载模型权重 ~2GB 到缓存（需联网+磁盘+代理）。
// 部署决策（spec 4.7）：开发用本地 M3，部署时实测 Vercel，跑不动则降级。

import { pipeline, env } from '@huggingface/transformers';
import { setupProxy } from '@/lib/supabase/proxy';

const MODEL_ID = 'Xenova/bge-m3';
let extractor: any = null;

// Node 端：允许从远端拉模型（首次下载），缓存到本地
env.allowLocalModels = false;
env.allowRemoteModels = true;

/** 懒加载 pipeline（首次调用下载模型 ~2GB） */
async function getExtractor() {
  if (!extractor) {
    // 确保模型下载走代理（本机翻墙连 HuggingFace；复用 M1 的 proxy.ts）
    setupProxy();
    console.log('[embedder] 首次加载 BGE-M3 模型（~2GB），请稍候...');
    extractor = await pipeline('feature-extraction', MODEL_ID);
    console.log('[embedder] 模型加载完成');
  }
  return extractor;
}

/** 单条文本 → 1024 维向量（归一化） */
export async function embed(text: string): Promise<number[]> {
  const ext = await getExtractor();
  const output = await ext(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data as Float32Array);
}

/** 批量 embedding（建库用；M3 逐条调，带进度日志） */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i++) {
    results.push(await embed(texts[i]));
    if ((i + 1) % 50 === 0) console.log(`[embedder] 进度 ${i + 1}/${texts.length}`);
  }
  return results;
}
