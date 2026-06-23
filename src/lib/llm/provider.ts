// src/lib/llm/provider.ts
// LLM Provider 工厂（spec 3.3：抽象，DeepSeek 默认，后台可切）。
// MVP 默认 deepseek；未来可读 env/DB 切换到 glm 等。

import type { LLMProvider } from './types';
import { deepseekProvider } from './deepseek';

let currentProvider: LLMProvider = deepseekProvider;

/** 取当前 provider（默认 deepseek） */
export function getProvider(): LLMProvider {
  // 未来：if (process.env.LLM_PROVIDER === 'glm') return glmProvider;
  return currentProvider;
}

/** 后台切换 provider（预留，MVP 不暴露） */
export function setProvider(p: LLMProvider): void {
  currentProvider = p;
}

export { deepseekProvider };
