// src/lib/ask/context-builder.ts
// 追问 context 分层拼装（spec 5.2）。
//
// ⚠️ 最高约束1：严格分层，不自由发挥。
//   【全量层 · 永不压缩】盘面快照 + ②层结构化解读 + 解读全文 + 古籍 —— 事实底座，每次全量注入
//   【压缩层 · 超100K压缩】历史摘要 + 近期对话原文
//   【本轮】用户这次追问
//   【兜底 · 偏离时才注入】偏离已涉及主题 → 定向 RAG 补古籍
// 关键：全量层是事实底座，绝不能被压缩（压缩它们会丢命理精度）。

import type { ProfileSnapshot, InterpretSnapshot } from '@/lib/supabase/snapshot';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  tokens?: number;
}

export interface ConversationSummary {
  topics: string[];
  conclusions: Record<string, string>;
  focusPoints: string[];
}

export interface AskContext {
  /** birth_profiles 快照：盘面 + ②层结构化解读（全量层） */
  profile: ProfileSnapshot;
  /** interpretations 快照：解读全文 + 古籍（全量层） */
  interpret: InterpretSnapshot | null;
  /** 压缩层：历史摘要（若压缩过） */
  summary: ConversationSummary | null;
  /** 压缩层：summary_until_idx 之后的近期对话原文 */
  recentMessages: ConversationMessage[];
  /** 本轮：用户这次追问 */
  question: string;
  /** 兜底：偏离主题时定向检索补的古籍（未偏离则空） */
  fallbackClassics?: unknown[];
}

/** 拼装 system prompt（追问人设，复用解读人格：学者/隐士） */
export function buildAskSystemPrompt(persona: 'scholar' | 'hermit'): string {
  const tone =
    persona === 'scholar'
      ? '客观、专业、克制，如博导般引经据典、逻辑严密'
      : '随性、风趣、一针见血，如酒后老友般生动比喻';
  return `你是青囊命理参详师，正在与用户就其命盘进行追问对话。
人设：${tone}。
基于已提供的命盘信息、解读结论、古籍原文回答追问。
要求：
1. 引用具体五行/用神/年份/方位等术语，不泛化（如"用神木宜东方"而非"运势不错"）
2. 不确定时明说，不编造古籍
3. 仅作文化研究，不构成决策建议`;
}

/**
 * 拼装 user prompt（分层注入）。
 * 严格按 spec 5.2 顺序：全量层 → 兜底古籍 → 压缩层摘要 → 压缩层近期对话 → 本轮。
 * 全量层每个字段独立成块，永不省略（有数据就注入）。
 */
export function buildAskUserPrompt(ctx: AskContext): string {
  const parts: string[] = [];

  // ════════ 【全量层 · 永不压缩】事实底座 ════════
  // 盘面快照（四柱/藏干/五行/大运）
  if (ctx.profile.chart_snapshot) {
    parts.push('【命盘信息】\n' + JSON.stringify(ctx.profile.chart_snapshot, null, 2));
  }
  // ②层结构化解读（strength/pattern/yongshen）
  if (ctx.profile.analysis_snapshot) {
    parts.push('【格局用神】\n' + JSON.stringify(ctx.profile.analysis_snapshot, null, 2));
  }
  // 解读全文（详批结论，追问的事实底座）
  if (ctx.interpret?.content) {
    parts.push('【AI 详批全文】\n' + ctx.interpret.content);
  }
  // 解读时检索的古籍（追问复用，不重检索）
  if (ctx.interpret?.classics_snapshot && ctx.interpret.classics_snapshot.length > 0) {
    parts.push('【相关古籍】\n' + JSON.stringify(ctx.interpret.classics_snapshot));
  }

  // ════════ 【兜底 · 偏离时才注入】补古籍防幻觉 ════════
  if (ctx.fallbackClassics && ctx.fallbackClassics.length > 0) {
    parts.push('【补充古籍（用户追问偏离已涉及主题，定向检索）】\n' + JSON.stringify(ctx.fallbackClassics));
  }

  // ════════ 【压缩层 · 超100K压缩】对话过程 ════════
  // 历史摘要（压缩过的旧对话，保留关键命理结论）
  if (ctx.summary) {
    parts.push(
      '【历史对话摘要】\n已讨论主题: ' +
        ctx.summary.topics.join('、') +
        '\n关键结论: ' +
        JSON.stringify(ctx.summary.conclusions, null, 2) +
        '\n用户关注点: ' +
        ctx.summary.focusPoints.join('、'),
    );
  }
  // 近期对话原文（summary_until_idx 之后未压缩的）
  if (ctx.recentMessages.length > 0) {
    parts.push(
      '【近期对话】\n' +
        ctx.recentMessages.map((m) => `${m.role === 'user' ? '用户' : '青囊'}: ${m.content}`).join('\n\n'),
    );
  }

  // ════════ 【本轮】用户这次追问 ════════
  parts.push('【用户追问】\n' + ctx.question);

  return parts.join('\n\n---\n\n');
}
