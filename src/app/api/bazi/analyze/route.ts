// src/app/api/bazi/analyze/route.ts
//
// ②层解读 API：POST /api/bazi/analyze
// 接受 ChartInput（和 chart 端点一致），内部先①层排盘再②层解读，一次返回 chart + analysis。
// HTTP 层很薄，只做入参解析和错误处理；解读逻辑在 analyzeBazi。
//
// 性质：纯计算（不查库、不写库），免费（spec 1.3/2.2）。

import { NextRequest, NextResponse } from 'next/server';
import { adaptBaziCore } from '@/lib/bazi/bazi-core-adapter';
import { analyzeBazi } from '@/lib/bazi-engine';
import type { ChartInput } from '@/types/bazi';

export async function POST(request: NextRequest) {
  let body: Partial<ChartInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体必须是 JSON' }, { status: 400 });
  }

  try {
    // ①层排盘（复用 M1 adapter）
    const chart = adaptBaziCore(body as ChartInput);
    // ②层解读
    const analysis = analyzeBazi(chart);
    return NextResponse.json({ chart, analysis });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '解读失败';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
