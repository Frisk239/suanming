// src/app/api/bazi/ask/route.ts
//
// M7 Phase 2 追问 API：POST /api/bazi/ask（SSE 流式）。
//
// 流程（spec 六）：
//   1. requireUser()                       ← 登录门槛（未登录 401）
//   2. 读 birth_profiles + interpretations 快照 ← 全量层（事实底座，永不压缩）
//   3. 读/建 conversations                 ← 压缩层（对话记录）
//   4. 偏离检测（关键词匹配，约束2）→ 必要时定向 RAG 补古籍
//   5. 拼 context（分层注入，约束1），估算 token
//   6. > 100K？→ 压缩对话层（只压对话，全量层不动）
//   7. streamChat（DeepSeek SSE）
//   8. 流结束回写 messages + total_tokens
//
// SSE 格式复用 interpret：data: {"token":"..."}\n\n + data: [DONE]\n\n。

import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/supabase/session';
import { createAdmin } from '@/lib/supabase/admin';
import {
  findInterpretSnapshot,
} from '@/lib/supabase/snapshot';
import { retrieve } from '@/lib/rag/retriever';
import { getProvider } from '@/lib/llm/provider';
import {
  buildAskSystemPrompt,
  buildAskUserPrompt,
  type ConversationMessage,
  type ConversationSummary,
} from '@/lib/ask/context-builder';
import { isTopicCovered } from '@/lib/ask/topic-detector';
import { estimateTokens } from '@/lib/ask/token-estimator';
import { needsCompact, compactMessages, messagesTokens } from '@/lib/ask/compactor';

interface ProfileRow {
  id: string;
  user_id: string;
  chart_snapshot: any;
  analysis_snapshot: any;
  engine_version: string | null;
}

interface ConvRow {
  id: string;
  user_id: string;
  messages: ConversationMessage[] | null;
  summary: ConversationSummary | null;
  summary_until_idx: number | null;
  total_tokens: number | null;
}

export async function POST(request: NextRequest) {
  // 1. 登录门槛
  let user;
  try {
    user = await requireUser();
  } catch {
    return new Response(JSON.stringify({ error: '请先登录' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json().catch(() => null);
  if (!body?.profileId || !body?.message) {
    return new Response(JSON.stringify({ error: '需要 profileId 和 message' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const { profileId, message } = body;

  const supabase = createAdmin();

  // 2. 读快照（全量层）—— birth_profiles 盘面快照 + interpretations 详批快照
  const { data: profile } = (await supabase
    .from('birth_profiles')
    .select('id, user_id, chart_snapshot, analysis_snapshot, engine_version')
    .eq('id', profileId)
    .maybeSingle()) as { data: ProfileRow | null };
  if (!profile) {
    return new Response(JSON.stringify({ error: '盘不存在' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  // 安全：会话归属校验（profile 必须属于当前用户）
  if (profile.user_id !== user.id) {
    return new Response(JSON.stringify({ error: '无权访问此盘' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const interpretSnapshot = await findInterpretSnapshot(profileId);

  // 3. 读/建会话（压缩层）
  let { data: conv } = (await supabase
    .from('conversations')
    .select('id, user_id, messages, summary, summary_until_idx, total_tokens')
    .eq('profile_id', profileId)
    .maybeSingle()) as { data: ConvRow | null };
  if (!conv) {
    const { data: newConv, error } = (await supabase
      .from('conversations')
      .insert({ user_id: user.id, profile_id: profileId })
      .select('id, user_id, messages, summary, summary_until_idx, total_tokens')
      .single()) as { data: ConvRow | null; error: any };
    if (error || !newConv) {
      return new Response(JSON.stringify({ error: '创建会话失败' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    conv = newConv;
  }

  const messages: ConversationMessage[] = conv.messages ?? [];
  const summary: ConversationSummary | null = conv.summary;
  const summaryUntilIdx: number = conv.summary_until_idx ?? 0;

  // 4. 偏离检测（约束2：关键词匹配，不上 LLM）→ 偏离才定向 RAG 补古籍
  let fallbackClassics: unknown[] | undefined;
  if (!isTopicCovered(message)) {
    const analysis = profile.analysis_snapshot;
    const chart = profile.chart_snapshot;
    const classics = await retrieve({
      patternName: analysis?.pattern?.name ?? '',
      yongshenPrimary: analysis?.yongshen?.primary ?? '',
      strengthLevel: analysis?.strength?.level ?? '',
      dayMaster: chart?.day?.gan ?? '',
      monthBranch: chart?.month?.zhi ?? '',
    });
    fallbackClassics = classics;
  }

  // 5. 拼 context（分层注入，约束1）+ 估算 token
  const recentMessages = messages.slice(summaryUntilIdx);
  const systemPrompt = buildAskSystemPrompt('scholar');
  let userPrompt = buildAskUserPrompt({
    profile,
    interpret: interpretSnapshot,
    summary,
    recentMessages,
    question: message,
    fallbackClassics,
  });
  let totalTokens = estimateTokens(systemPrompt + userPrompt);

  // 6. 超 100K 压缩（只压对话层，全量层不动）
  let compressedSummary = summary;
  let compressedUntilIdx = summaryUntilIdx;
  if (needsCompact(totalTokens + messagesTokens(messages))) {
    const oldMessages = messages.slice(0, Math.floor(messages.length / 2));
    if (oldMessages.length > 0) {
      const newSummary = await compactMessages(oldMessages, summary);
      compressedUntilIdx = summaryUntilIdx + oldMessages.length;
      // 重新拼装（用新 summary + 更少的近期对话）
      userPrompt = buildAskUserPrompt({
        profile,
        interpret: interpretSnapshot,
        summary: newSummary,
        recentMessages: messages.slice(compressedUntilIdx),
        question: message,
        fallbackClassics,
      });
      totalTokens = estimateTokens(systemPrompt + userPrompt);
      compressedSummary = newSummary;
    }
  }

  // 7. 流式回答
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let fullAnswer = '';
      try {
        await getProvider().streamChat(systemPrompt, userPrompt, (token) => {
          fullAnswer += token;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
        });
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : '追问失败';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
      } finally {
        // 8. 回写会话（即使出错/空也回写用户消息，保持对话连续性）
        const newMessages: ConversationMessage[] = [
          ...messages,
          { role: 'user', content: message, tokens: estimateTokens(message) },
        ];
        if (fullAnswer) {
          newMessages.push({
            role: 'assistant',
            content: fullAnswer,
            tokens: estimateTokens(fullAnswer),
          });
        }
        try {
          await supabase
            .from('conversations')
            .update({
              messages: newMessages,
              message_count: newMessages.length,
              summary: compressedSummary,
              summary_until_idx: compressedUntilIdx,
              total_tokens: (conv.total_tokens ?? 0) + estimateTokens(message + fullAnswer),
              updated_at: new Date().toISOString(),
            })
            .eq('id', conv.id);
        } catch {
          // 回写失败不阻断已完成的流
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
