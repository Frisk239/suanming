// src/lib/ask/compactor.ts
// 对话压缩（spec 5.4）。
//
// ⚠️ 最高约束1：压缩只针对对话层（messages），全量层（盘面/解读/古籍）永不动。
// 触发条件：拼装后总 token > 100K。
// 做法：取旧对话（最早一半）交 DeepSeek 生成结构化摘要
//   {topics, conclusions, focusPoints}，prompt 约束"保留具体五行/用神/年份等术语，禁止泛化"。
// max_tokens=5K，结果存 DB（不重复压）。

import { getProvider } from '@/lib/llm/provider';
import type { ConversationMessage, ConversationSummary } from './context-builder';
import { estimateTokens } from './token-estimator';

/** 压缩触发阈值（v4-flash 1M context，卡 100K 务实） */
export const COMPACT_THRESHOLD = 100000;

/** 是否需要压缩 */
export function needsCompact(totalTokens: number): boolean {
  return totalTokens > COMPACT_THRESHOLD;
}

/**
 * 压缩 prompt（spec 5.4）。
 * 关键约束：保留具体命理术语，禁止泛化——
 *   "用神木宜东方、2027丁未年有官非" 不能压成 "事业不错"。
 */
const COMPACT_SYSTEM_PROMPT = `你是命理对话压缩器。将命理追问对话压缩成结构化摘要。
要求：
1. 保留所有具体五行/用神/年份/方位/格局/十神等关键术语，禁止泛化
   （"用神木宜东方、2027丁未年官非"不能压成"事业不错"）
2. 严格输出 JSON：{"topics":["主题"],"conclusions":{"主题":"结论"},"focusPoints":["关注点"]}
3. conclusions 主题用：事业/财运/婚姻感情/健康/家人六亲（或对话实际涉及的主题）
4. 只输出 JSON，不要任何额外说明文字`;

/** 解析压缩 LLM 输出（剥 markdown 代码块） */
function parseCompactResult(result: string, fallback: ConversationSummary | null): ConversationSummary {
  const jsonStr = result
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();
  try {
    const parsed = JSON.parse(jsonStr) as ConversationSummary;
    // 基本结构校验
    return {
      topics: Array.isArray(parsed.topics) ? parsed.topics : [],
      conclusions: parsed.conclusions && typeof parsed.conclusions === 'object' ? parsed.conclusions : {},
      focusPoints: Array.isArray(parsed.focusPoints) ? parsed.focusPoints : [],
    };
  } catch {
    // 解析失败兜底：返回已有摘要或最小结构（不阻断追问）
    return {
      topics: fallback?.topics ?? [],
      conclusions: fallback?.conclusions ?? {},
      focusPoints: fallback?.focusPoints ?? [],
    };
  }
}

/**
 * 压缩旧对话为结构化摘要。
 * @param oldMessages 要压缩的旧对话（最早的一半）
 * @param existingSummary 已有摘要（合并增量压缩）
 */
export async function compactMessages(
  oldMessages: ConversationMessage[],
  existingSummary: ConversationSummary | null,
): Promise<ConversationSummary> {
  const provider = getProvider();
  const dialogText = oldMessages
    .map((m) => `${m.role === 'user' ? '用户' : '青囊'}: ${m.content}`)
    .join('\n\n');
  const userPrompt =
    (existingSummary ? '已有摘要（请合并）：\n' + JSON.stringify(existingSummary, null, 2) + '\n\n' : '') +
    '需要压缩的对话：\n' +
    dialogText;

  let result = '';
  await provider.streamChat(COMPACT_SYSTEM_PROMPT, userPrompt, (token) => {
    result += token;
  });

  return parseCompactResult(result, existingSummary);
}

/** 算 messages 总 token（各消息 tokens 字段优先，无则估算） */
export function messagesTokens(messages: ConversationMessage[]): number {
  return messages.reduce((sum, m) => sum + (m.tokens ?? estimateTokens(m.content)), 0);
}
