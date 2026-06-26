// src/app/api/bazi/interpret/route.ts
//
// ③层 AI 详批 API：POST /api/bazi/interpret
// 接受 ChartInput + 人格/深度选项，内部串行：
//   ①层排盘(adaptBaziCore) → ②层解读(analyzeBazi) → RAG 检索(retrieve)
//   → 拼 prompt(buildSystemPrompt/buildUserPrompt) → LLM 流式(getProvider().streamChat)
// 返回 SSE 流（data: {"token":"..."}\n\n ... data: [DONE]）。
//
// 详批门槛（spec 5.3，M5）：排盘免费，AI 详批需登录。
// M7 Phase 1：登录用户存 interpret 详批快照（全文 + classics 挂 interpretations 表），
//   下次同盘解读读快照不重调 DeepSeek。需前端带 useCache 才走快照路径（默认仍生成）。

import { NextRequest } from 'next/server';
import { adaptBaziCore } from '@/lib/bazi/bazi-core-adapter';
import { analyzeBazi } from '@/lib/bazi-engine';
import { retrieve } from '@/lib/rag/retriever';
import { getProvider } from '@/lib/llm/provider';
import { buildSystemPrompt, buildUserPrompt } from '@/lib/llm/prompt';
import { requireUser } from '@/lib/supabase/session';
import {
  findOrCreateProfile,
  findInterpretSnapshot,
  saveInterpretSnapshot,
} from '@/lib/supabase/snapshot';
import type { ChartInput } from '@/types/bazi';
import type { Persona, Depth } from '@/lib/llm/types';
import {
  acquire,
  release,
  tryAcquireGlobal,
  releaseGlobal,
} from '@/lib/concurrency';

export async function POST(request: NextRequest) {
  // 详批门槛（spec 5.3，M5）：排盘免费，AI 详批需登录。
  // 未登录返回 401，前端 InterpretPanel 展示「登录后详批」引导。
  let user;
  try {
    user = await requireUser();
  } catch {
    return new Response(JSON.stringify({ error: '请先登录后再使用 AI 详批' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 全局限流（spec 6.3）：防多用户突发打爆 4 核。最早插入，在任何 DB 工作之前。
  if (!tryAcquireGlobal()) {
    return new Response(JSON.stringify({ error: '当前使用人数较多，请稍后重试' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '5' },
    });
  }

  let body: { chart: ChartInput; persona?: Persona; depth?: Depth; useCache?: boolean };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: '请求体必须是 JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { chart: chartInput, persona = 'scholar', depth = 'standard', useCache = true } = body;

  // 同步阶段（排盘/解读/检索）：出错直接返回 400
  let systemPrompt: string;
  let userPrompt: string;
  let classics: Awaited<ReturnType<typeof retrieve>>;
  let profileId: string | null = null;
  try {
    // M7：登录用户建/查 profile（追问 context 需 profileId）
    const profile = await findOrCreateProfile(user.id, chartInput);
    profileId = profile.id;

    // 同用户同盘锁（spec 6.2）：防同用户连点/多标签页。
    if (!acquire(user.id, profile.id)) {
      releaseGlobal(); // 释放全局名额（这次请求不消耗）
      return new Response(JSON.stringify({ error: '上一条详批还在生成，请稍候' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // M7：useCache 且有 interpret 快照 → 直接返回快照全文（不重调 DeepSeek）
    if (useCache) {
      const cached = await findInterpretSnapshot(profileId);
      if (cached?.content) {
        // 快照命中是「免费」路径（不调 LLM/不 embed），必须释放两锁，否则挤占全局名额
        release(user.id, profile.id);
        releaseGlobal();
        return cachedResponse(cached.content);
      }
    }

    // ①层排盘（复用 M1 adapter）
    const chart = adaptBaziCore(chartInput);
    // ②层解读（复用 M2）
    const analysis = analyzeBazi(chart);
    // RAG 检索（双路：向量 + 穷通宝鉴精确）
    classics = await retrieve({
      patternName: analysis.pattern.name,
      yongshenPrimary: analysis.yongshen.primary,
      strengthLevel: analysis.strength.level,
      dayMaster: chart.day.gan,
      monthBranch: chart.month.zhi,
    });
    // 拼 prompt
    const interpretInput = {
      chartSummary: {
        dayMaster: chart.day.gan,
        gender: chart.gender,
        solarDate: chart.solarDate,
        lunarDate: chart.lunarDate,
        pillars: [chart.year.ganZhi, chart.month.ganZhi, chart.day.ganZhi, chart.time.ganZhi],
      },
      analysis,
      classics,
      options: { persona, depth },
    };
    systemPrompt = buildSystemPrompt(interpretInput);
    userPrompt = buildUserPrompt(interpretInput);
  } catch (e: unknown) {
    // 准备阶段出错：释放已获取的锁（profileId 若已赋值则同用户锁已 acquire）
    if (profileId) release(user.id, profileId);
    releaseGlobal();
    const msg = e instanceof Error ? e.message : '详评准备失败';
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // SSE 流式（LLM 阶段）：错误以 SSE event 形式吐给前端，不中断流
  const encoder = new TextEncoder();
  // 客户端断开（点停止/abort）时 abort 这个 controller，让 DeepSeek fetch 也中断，
  // 避免锁泄漏：旧实现不传 signal，停止后 LLM 在后台空跑~20s 占着锁，换风格撞 409。
  const llmAbort = new AbortController();
  const stream = new ReadableStream({
    async start(controller) {
      const provider = getProvider();
      let fullText = '';
      try {
        await provider.streamChat(systemPrompt, userPrompt, (token) => {
          fullText += token;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
        }, llmAbort.signal);
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (e: unknown) {
        // abort（用户停止）属于正常结束，不吐错误帧
        const aborted = llmAbort.signal.aborted;
        if (!aborted) {
          const msg = e instanceof Error ? e.message : 'LLM 调用失败';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
        }
      } finally {
        // 释放并发锁（流结束/出错/被取消都触发）
        release(user.id, profileId);
        releaseGlobal();
        // M7：流成功有全文则存 interpret 快照（含 classics 供追问复用）
        if (fullText && profileId) {
          await saveInterpretSnapshot(
            profileId,
            user.id,
            fullText,
            classics,
            persona,
            depth,
          ).catch(() => {
            // 存快照失败不阻断响应（已流完）
          });
        }
        controller.close();
      }
    },
    // 客户端断开（fetch abort / 点停止）时触发：中断 LLM 调用，
    // start 的 catch→finally 随即释放锁。锁释放逻辑只在 finally，避免 double release。
    cancel() {
      llmAbort.abort();
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

/** 快照命中：把全文作为一次性 SSE 帧返回（前端无感，走同一套解析） */
function cachedResponse(content: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: content })}\n\n`));
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
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
