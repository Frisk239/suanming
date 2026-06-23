// src/lib/llm/types.ts
// ③层 LLM 类型定义。对齐 spec 3.3（Provider 抽象）+ 4.5（prompt 拼装）。

import type { BaziAnalysisResult } from '@/lib/bazi-engine';
import type { RetrievalResult } from '@/lib/rag/types';

/** 解读人格 */
export type Persona = 'scholar' | 'hermit';
/** 解读深度 */
export type Depth = 'standard' | 'popular';

export interface InterpretOptions {
  persona: Persona;
  depth: Depth;
}

/** interpret 入参（②层结果 + 检索古籍 + ①层头部信息） */
export interface InterpretInput {
  /** ①层关键信息（供 prompt 头部） */
  chartSummary: {
    dayMaster: string;
    gender: string;
    solarDate: string;
    lunarDate: string;
    pillars: string[]; // ['庚午','壬午','辛亥','己亥']
  };
  /** ②层结果 */
  analysis: BaziAnalysisResult;
  /** RAG 检索结果 */
  classics: RetrievalResult[];
  /** 人格/深度 */
  options: InterpretOptions;
}

/** 流式 token 回调 */
export type StreamCallback = (token: string) => void;

/**
 * LLM Provider 接口（spec 3.3：抽象，DeepSeek 默认，可后台切）。
 * 仅约定流式 chat，实现细节由各 provider 自行处理。
 */
export interface LLMProvider {
  name: string;
  streamChat(
    systemPrompt: string,
    userPrompt: string,
    onToken: StreamCallback,
    signal?: AbortSignal,
  ): Promise<void>;
}
