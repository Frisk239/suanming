// src/lib/llm/deepseek.ts
// DeepSeek chat（OpenAI 兼容接口）流式实现。
// 配置：DEEPSEEK_API_KEY 环境变量（用户提供，不入库）。
// 文档：https://api-docs.deepseek.com/zh-cn/api/create-chat-completion
//
// 模型名说明（实测核实，2026-06）：
//   - deepseek-chat（旧名）将于 2026/7/24 弃用
//   - 改用 deepseek-v4-flash（默认）；可在 .env.local 设 DEEPSEEK_MODEL=deepseek-v4-pro 切换
//   - v4-flash 默认思考模式 enabled 会输出 reasoning_content 思维链；
//     命理解读要"直给四段式长文"，关闭思考模式省 token、避免思维链混入

import type { LLMProvider } from './types';

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const MODEL = process.env.DEEPSEEK_MODEL ?? 'deepseek-v4-flash';

export const deepseekProvider: LLMProvider = {
  name: 'deepseek',
  async streamChat(systemPrompt, userPrompt, onToken, signal) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error('DEEPSEEK_API_KEY 未配置');

    const resp = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: true,
        temperature: 0.7,
        // 关闭思考模式：v4-flash 默认 enabled 输出思维链，解读要直给四段式
        thinking: { type: 'disabled' },
      }),
      signal,
    });

    if (!resp.ok || !resp.body) {
      const text = await resp.text().catch(() => '');
      throw new Error(`DeepSeek ${resp.status}: ${text}`);
    }

    // 解析 SSE 流（OpenAI 兼容：data: {...}\n\n，末尾 data: [DONE]）
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') return;
        try {
          const json = JSON.parse(payload);
          const token = json.choices?.[0]?.delta?.content;
          if (token) onToken(token);
        } catch {
          /* 跳过非 JSON 行（如注释/keep-alive） */
        }
      }
    }
  },
};
