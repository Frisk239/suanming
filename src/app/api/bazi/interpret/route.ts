// src/app/api/bazi/interpret/route.ts
//
// ③层 AI 详批 API：POST /api/bazi/interpret
// 接受 ChartInput + 人格/深度选项，内部串行：
//   ①层排盘(adaptBaziCore) → ②层解读(analyzeBazi) → RAG 检索(retrieve)
//   → 拼 prompt(buildSystemPrompt/buildUserPrompt) → LLM 流式(getProvider().streamChat)
// 返回 SSE 流（data: {"token":"..."}\n\n ... data: [DONE]）。
//
// HTTP 层薄：只做入参解析、串接、SSE 封装；逻辑在 lib 各模块。

import { NextRequest } from 'next/server';
import { adaptBaziCore } from '@/lib/bazi/bazi-core-adapter';
import { analyzeBazi } from '@/lib/bazi-engine';
import { retrieve } from '@/lib/rag/retriever';
import { getProvider } from '@/lib/llm/provider';
import { buildSystemPrompt, buildUserPrompt } from '@/lib/llm/prompt';
import { requireUser } from '@/lib/supabase/session';
import type { ChartInput } from '@/types/bazi';
import type { Persona, Depth } from '@/lib/llm/types';

export async function POST(request: NextRequest) {
  // 详批门槛（spec 5.3，M5）：排盘免费，AI 详批需登录。
  // 未登录返回 401，前端 InterpretPanel 展示「登录后详批」引导。
  try {
    await requireUser();
  } catch {
    return new Response(JSON.stringify({ error: '请先登录后再使用 AI 详批' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { chart: ChartInput; persona?: Persona; depth?: Depth };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: '请求体必须是 JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { chart: chartInput, persona = 'scholar', depth = 'standard' } = body;

  // 同步阶段（排盘/解读/检索）：出错直接返回 400
  let systemPrompt: string;
  let userPrompt: string;
  try {
    // ①层排盘（复用 M1 adapter）
    const chart = adaptBaziCore(chartInput);
    // ②层解读（复用 M2）
    const analysis = analyzeBazi(chart);
    // RAG 检索（双路：向量 + 穷通宝鉴精确）
    const classics = await retrieve({
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
    const msg = e instanceof Error ? e.message : '详评准备失败';
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // SSE 流式（LLM 阶段）：错误以 SSE event 形式吐给前端，不中断流
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const provider = getProvider();
      try {
        await provider.streamChat(systemPrompt, userPrompt, (token) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
        });
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'LLM 调用失败';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
      } finally {
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
