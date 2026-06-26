// src/app/(app)/paipan/[id]/page.tsx
// 命盘详情页（M8 历史记录·只读）。Server Component。
// 按 id + user_id 查 birth_profile 快照 + 最新 interpretation，只读渲染。
// 安全红线（spec 3.1）：createServerClient（走 RLS）+ .eq('user_id') 双重保护；越权 404。

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/supabase/session';
import { isSnapshotValid } from '@/lib/supabase/snapshot';
import { ChartBoard } from '@/components/bazi/ChartBoard';
import { AnalysisPanel } from '@/components/bazi/AnalysisPanel';
import { InterpretView } from '@/components/bazi/InterpretView';

interface ProfileRow {
  id: string;
  user_id: string;
  name: string | null;
  gender: string | null;
  birth_date: string | null;
  birth_time: string | null;
  chart_snapshot: any | null;
  analysis_snapshot: any | null;
  engine_version: string | null;
}

interface InterpRow {
  content: string | null;
  created_at: string;
}

export default async function PaipanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSession();
  // 未登录不应到此（account 列表才登录可见），防御性重定向
  if (!user) return notFound();

  const supabase = await createServerClient();

  // 查 profile（双重保护：RLS + .eq user_id）
  const { data: profile } = (await supabase
    .from('birth_profiles')
    .select('id, user_id, name, gender, birth_date, birth_time, chart_snapshot, analysis_snapshot, engine_version')
    .eq('id', id)
    .eq('user_id', user.id) // 安全红线：即使 RLS 失效也兜底
    .maybeSingle()) as { data: ProfileRow | null };

  // 越权或不存在 → 404（不暴露 id 存在与否）
  if (!profile) return notFound();

  // 快照失效（engine_version 不匹配，chart_snapshot 仍在但判定无效）→ 引导重排
  if (!isSnapshotValid(profile as any)) {
    return (
      <main className="min-h-screen bg-xuan-zhi-warm pt-16 pb-12 px-4">
        <div className="max-w-md mx-auto text-center space-y-4 pt-16">
          <p className="font-serif text-lg text-dai-qing">盘面需更新</p>
          <p className="text-sm text-dai-qing/60">解读引擎已升级，该命盘需重新排盘</p>
          <Link
            href="/bazi"
            className="inline-block px-6 py-2.5 rounded-[14px] bg-dai-qing text-xuan-zhi-warm font-serif text-sm tracking-[0.2em] hover:bg-dai-qing-dark transition-colors"
          >
            去重新排盘
          </Link>
        </div>
      </main>
    );
  }

  // 查最新一条详批（该 profile）
  const { data: interp } = (await supabase
    .from('interpretations')
    .select('content, created_at')
    .eq('birth_profile_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()) as { data: InterpRow | null };

  return (
    <main className="min-h-screen bg-xuan-zhi-warm pt-16 pb-12 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <Link
          href="/account"
          className="inline-block text-xs text-dai-qing/60 hover:text-dai-qing transition-colors"
        >
          ← 我的命盘
        </Link>

        {/* 命盘头 */}
        <div className="text-center pt-2 pb-2">
          <p className="font-serif text-lg text-dai-qing">
            {profile.name || '未命名'} · {profile.gender === 'male' ? '男' : '女'}
          </p>
          <p className="text-xs text-dai-qing/50 mt-1">
            {profile.birth_date} {profile.birth_time}
          </p>
        </div>

        {/* 盘面 + ②层（复用现有组件，传快照） */}
        <ChartBoard chart={profile.chart_snapshot} />
        <AnalysisPanel analysis={profile.analysis_snapshot} />

        {/* 详批（只读） */}
        {interp?.content ? (
          <InterpretView content={interp.content} createdAt={interp.created_at} />
        ) : (
          <section className="rounded-2xl border border-dai-qing/10 bg-xuan-zhi p-6 text-center">
            <p className="text-sm text-dai-qing/60">尚未详批</p>
          </section>
        )}

        <p className="text-center text-[11px] text-dai-qing/35 leading-relaxed pt-2">
          仅作文化研究与体验，不构成任何决策建议
        </p>
      </div>
    </main>
  );
}
