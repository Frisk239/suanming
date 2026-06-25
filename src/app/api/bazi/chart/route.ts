// src/app/api/bazi/chart/route.ts
//
// ①层排盘 API：POST /api/bazi/chart
// HTTP 层很薄，只做入参解析和错误处理；排盘逻辑在 buildChart。
//
// 性质：纯计算（不查库），免费（spec 1.3）。
// M7 Phase 1：前端主路径走 analyze（一次拿 chart+analysis），此端点保持可用，
//   登录用户也存盘面快照（与 analyze 一致，避免双入口数据不一致）。

import { NextRequest, NextResponse } from 'next/server';
import { buildChart } from '@/lib/bazi/chart';
import { getSession } from '@/lib/supabase/session';
import {
  findOrCreateProfile,
  isSnapshotValid,
  saveProfileSnapshot,
} from '@/lib/supabase/snapshot';
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
    // M7：登录则查盘面快照（秒开），有且版本匹配直接返回
    const user = await getSession();
    if (user) {
      const profile = await findOrCreateProfile(user.id, body as ChartInput);
      if (isSnapshotValid(profile)) {
        return NextResponse.json({ chart: profile.chart_snapshot, profileId: profile.id });
      }
      const chart = buildChart(body as ChartInput);
      const analysis = analyzeBazi(chart);
      await saveProfileSnapshot(profile.id, chart, analysis);
      return NextResponse.json({ chart, profileId: profile.id });
    }
    // 未登录：纯计算原逻辑
    const chart = buildChart(body as ChartInput);
    return NextResponse.json({ chart });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '排盘失败';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
