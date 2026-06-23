// src/app/api/bazi/chart/route.ts
//
// ①层排盘 API：POST /api/bazi/chart
// HTTP 层很薄，只做入参解析和错误处理；排盘逻辑在 buildChart。
//
// 性质：纯计算（不查库），免费（spec 1.3）。

import { NextRequest, NextResponse } from 'next/server';
import { buildChart } from '@/lib/bazi/chart';
import type { ChartInput } from '@/types/bazi';

export async function POST(request: NextRequest) {
  let body: Partial<ChartInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体必须是 JSON' }, { status: 400 });
  }

  try {
    const chart = buildChart(body as ChartInput);
    return NextResponse.json({ chart });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '排盘失败';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
