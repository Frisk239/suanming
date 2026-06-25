// src/app/api/bazi/analyze/route.ts
//
// ②层解读 API：POST /api/bazi/analyze
// 接受 ChartInput（和 chart 端点一致），内部先①层排盘再②层解读，一次返回 chart + analysis。
//
// 性质：免费（spec 1.3/2.2）。排盘/②层免费，登录/未登录都能用。
// M7 Phase 1：登录用户存盘面快照（chart/analysis 挂 birth_profiles），
//   下次同盘进入直接读快照秒开（不重算）。未登录走纯计算原逻辑（不存快照）。

import { NextRequest, NextResponse } from 'next/server';
import { adaptBaziCore } from '@/lib/bazi/bazi-core-adapter';
import { analyzeBazi } from '@/lib/bazi-engine';
import { getSession } from '@/lib/supabase/session';
import {
  findOrCreateProfile,
  isSnapshotValid,
  saveProfileSnapshot,
} from '@/lib/supabase/snapshot';
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
        return NextResponse.json({
          chart: profile.chart_snapshot,
          analysis: profile.analysis_snapshot,
          profileId: profile.id,
        });
      }
      // 无快照/版本不匹配 → 重算并存快照
      const chart = adaptBaziCore(body as ChartInput);
      const analysis = analyzeBazi(chart);
      await saveProfileSnapshot(profile.id, chart, analysis);
      return NextResponse.json({ chart, analysis, profileId: profile.id });
    }
    // 未登录：纯计算原逻辑（不存快照）
    const chart = adaptBaziCore(body as ChartInput);
    const analysis = analyzeBazi(chart);
    return NextResponse.json({ chart, analysis });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '解读失败';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
