// src/lib/rag/embedder.ts
// 本地 BGE-M3 embedding（@huggingface/transformers v3）。
// v3 起包名从 @xenova/transformers 更名为 @huggingface/transformers（API 兼容）。
// 模型 repo 仍为 'Xenova/bge-m3'（HF Hub 上模型 id 未变，只是 npm 包改名）。
//
// 首次运行自动下载模型权重 ~2GB 到缓存（需联网+磁盘+代理）。
// 部署决策（spec 4.7）：开发用本地 M3，部署时实测 Vercel，跑不动则降级。

import { pipeline, env } from '@huggingface/transformers';
import { setupProxy } from '@/lib/supabase/proxy';
import fs from 'node:fs';
import path from 'node:path';

const MODEL_ID = 'Xenova/bge-m3';
let extractor: any = null;

// transformers.js v3 缓存目录（实测：node_modules/@huggingface/transformers/.cache）
const CACHE_DIR = path.resolve(
  process.cwd(),
  'node_modules/@huggingface/transformers/.cache/Xenova/bge-m3',
);

/**
 * 探测模型是否已缓存。已缓存则纯本地加载（避免 transformers 去 HF 校验 etag
 * —— 本机经代理连 HF 不稳定，会卡住；这是 spec 4.7 部署风险的实测应对）。
 * 未缓存则允许远端拉取（首次下载，需代理）。
 */
function configureModelSource() {
  const onnxData = path.join(CACHE_DIR, 'onnx/model.onnx_data');
  const onnxMeta = path.join(CACHE_DIR, 'onnx/model.onnx');
  const cached = fs.existsSync(onnxData) && fs.existsSync(onnxMeta);
  if (cached) {
    env.allowLocalModels = true;
    env.allowRemoteModels = false;
    console.log('[embedder] 检测到本地缓存，纯离线加载');
  } else {
    env.allowLocalModels = false;
    env.allowRemoteModels = true;
    console.log('[embedder] 无本地缓存，将远端下载（~2GB，需代理）');
  }
}

/** 懒加载 pipeline（首次调用下载模型 ~2GB） */
async function getExtractor() {
  if (!extractor) {
    configureModelSource();
    // 远端下载需走代理（本机翻墙连 HuggingFace；复用 M1 的 proxy.ts）
    setupProxy();
    console.log('[embedder] 加载 BGE-M3 模型，请稍候...');
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
