// src/app/(app)/account/ProfileListSection.tsx
// 「我的命盘」列表节（M8 历史记录入口）。Server Component。
// 两步查询（spec 2.2）：profiles + interpretations，JS reduce 取每盘最新详批。
// 走 createServerClient（带 session，RLS 隔离）。
//
// 展示策略：按核心字段（性别+生辰+经纬度）判重，同盘只保留最新一条；
// 全列表只展示最新 3 个（避免历史无限增长 + 弱化孤儿旧 profile 的影响）。

import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';

interface ProfileRow {
  id: string;
  name: string | null;
  gender: string | null;
  birth_date: string | null;
  birth_time: string | null;
  longitude: number | null;
  latitude: number | null;
  chart_snapshot: any | null;
  created_at: string;
}

interface InterpRow {
  birth_profile_id: string;
  content: string | null;
  created_at: string;
}

function SectionTitle({ zh, en }: { zh: string; en: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-serif text-base text-dai-qing">{zh}</h2>
      <p className="mt-0.5 text-[10px] tracking-[0.25em] text-hu-po-jin/55">{en}</p>
    </div>
  );
}

/** 从 chart_snapshot 取四柱摘要，如「庚午 壬午 辛亥 己亥」 */
function pillarsSummary(chart: any | null): string {
  if (!chart?.year?.ganZhi) return '';
  const ys = chart.year?.ganZhi ?? '';
  const ms = chart.month?.ganZhi ?? '';
  const ds = chart.day?.ganZhi ?? '';
  const ts = chart.time?.ganZhi ?? '';
  return [ys, ms, ds, ts].filter(Boolean).join(' ');
}

export async function ProfileListSection({ userId }: { userId: string }) {
  const supabase = await createServerClient();

  // 1. 当前用户所有命盘（倒序）
  const { data: rawProfiles } = (await supabase
    .from('birth_profiles')
    .select('id, name, gender, birth_date, birth_time, longitude, latitude, chart_snapshot, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })) as { data: ProfileRow[] | null };

  // 判重：核心字段（性别+生辰+经纬度）相同的视为同一盘，只保留最新的一条。
  // 同一盘可能因历史 bug（如修经纬度匹配前的旧 profile）或重新排盘产生多条记录，
  // 去重后只展示最新的一份，避免历史列表里同盘重复。created_at 已倒序，首条即最新。
  const seen = new Set<string>();
  const profiles = (rawProfiles ?? []).filter((p) => {
    const dedupeKey = `${p.gender}|${p.birth_date}|${p.birth_time}|${p.longitude}|${p.latitude}`;
    if (seen.has(dedupeKey)) return false;
    seen.add(dedupeKey);
    return true;
  }).slice(0, 3); // 只展示最新 3 个，避免列表无限增长

  // 2. 空状态
  if (!profiles || profiles.length === 0) {
    return (
      <section className="rounded-2xl border border-dai-qing/10 bg-xuan-zhi p-6 text-center">
        <SectionTitle zh="我的命盘" en="MY CHARTS" />
        <p className="text-sm text-dai-qing/60 mb-4">尚未建立命盘</p>
        <Link
          href="/bazi"
          className="inline-block px-6 py-2.5 rounded-[14px] bg-dai-qing text-xuan-zhi-warm font-serif text-sm tracking-[0.2em] hover:bg-dai-qing-dark transition-colors"
        >
          去排第一个盘
        </Link>
      </section>
    );
  }

  // 3. 取这些命盘的详批（每盘最新一条）
  const profileIds = profiles.map((p) => p.id);
  const { data: interps } = (await supabase
    .from('interpretations')
    .select('birth_profile_id, content, created_at')
    .in('birth_profile_id', profileIds)
    .order('created_at', { ascending: false })) as { data: InterpRow[] | null };

  // 4. JS reduce：每盘取第一条（已倒序，首条即最新）
  const latestByProfile = new Map<string, { created_at: string }>();
  for (const it of interps ?? []) {
    if (!latestByProfile.has(it.birth_profile_id)) {
      latestByProfile.set(it.birth_profile_id, { created_at: it.created_at });
    }
  }

  return (
    <section className="rounded-2xl border border-dai-qing/10 bg-xuan-zhi p-6">
      <SectionTitle zh="我的命盘" en="MY CHARTS" />
      <div className="space-y-2">
        {profiles.map((p) => {
          const latest = latestByProfile.get(p.id);
          const pillars = pillarsSummary(p.chart_snapshot);
          return (
            <Link
              key={p.id}
              href={`/paipan/${p.id}`}
              className="block rounded-xl border border-dai-qing/10 bg-xuan-zhi-warm p-4 hover:border-dai-qing/30 transition-colors"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-serif text-sm text-dai-qing">
                  {p.name || '未命名'} · {p.gender === 'male' ? '男' : '女'}
                </span>
                {pillars && (
                  <span className="font-serif-display text-xs text-hu-po-jin/70 tracking-wider">
                    {pillars}
                  </span>
                )}
              </div>
              <div className="mt-1 text-[11px] text-dai-qing/50">
                {p.birth_date} {p.birth_time}
              </div>
              <div className="mt-1.5 text-[11px] text-dai-qing/40">
                {latest
                  ? `最近详批：${new Date(latest.created_at).toLocaleDateString('zh-CN')}`
                  : '尚未详批'}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
