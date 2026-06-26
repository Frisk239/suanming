// src/lib/supabase/snapshot.ts
// 排盘/解读快照读写（M7 Phase 1）。
//
// 数据模型（发现1=A，复用 interpretations 表避免重复造轮子）：
//   - birth_profiles.chart_snapshot / analysis_snapshot / engine_version / snapshot_at
//     存盘面 + ②层解读快照（页面秒开用，直接挂在 profile 上查询最简）。
//   - interpretations 表（0001_init.sql 已有 chart_result/analysis_result/content）
//     复用存 interpret 全文，0004 加 classics_snapshot 存解读时检索的古籍（追问复用）。
//
// 快照失效（spec 4.3）：engine_version 控制盘面快照，版本不匹配 → 重排时重算。

import { createAdmin } from './admin';
import { ENGINE_VERSION } from '@/lib/bazi-engine';
import type { ChartInput } from '@/types/bazi';

/** birth_profiles 的盘面快照（②层 + 排盘） */
export interface ProfileSnapshot {
  id: string;
  user_id: string;
  chart_snapshot: unknown | null;
  analysis_snapshot: unknown | null;
  engine_version: string | null;
}

/** interpretations 的详批快照（③层全文 + 古籍） */
export interface InterpretSnapshot {
  id: string;
  birth_profile_id: string;
  content: string | null;
  classics_snapshot: unknown[] | null;
}

/**
 * 查/建用户某盘的 birth_profile，并取盘面快照。
 * 按 input 核心字段匹配（性别/经纬度/出生公历日期时间/真太阳时开关）。
 * 无则建行（最小字段），返回 profile id + 快照。
 */
export async function findOrCreateProfile(
  userId: string,
  input: ChartInput,
): Promise<ProfileSnapshot> {
  const supabase = createAdmin();
  // birth_date 是 date 类型（只日期），birth_time 单独存
  const [datePart, timePart = ''] = input.solarDate.split(' ');

  // 先查同输入的 profile。匹配条件含经纬度：出生地不同则真太阳时校正不同，
  // 是不同的盘，不能命中旧快照（否则换城市会显示旧地点的真太阳时/城市）。
  // city 名不参与匹配（仅回显用），以经纬度（排盘计算的实际依据）为准。
  const { data: existing } = await supabase
    .from('birth_profiles')
    .select('id, user_id, chart_snapshot, analysis_snapshot, engine_version')
    .eq('user_id', userId)
    .eq('gender', input.gender)
    .eq('birth_date', datePart)
    .eq('birth_time', timePart)
    .eq('use_true_solar', input.useTrueSolar ?? true)
    .eq('longitude', input.longitude ?? null)
    .eq('latitude', input.latitude ?? null)
    .maybeSingle();

  if (existing) return existing as ProfileSnapshot;

  // 无则建行（最小字段，is_default 不设，name 可选）
  const { data: created, error } = await supabase
    .from('birth_profiles')
    .insert({
      user_id: userId,
      name: input.name,
      gender: input.gender,
      birth_date: datePart,
      birth_time: timePart,
      is_lunar: input.isLunar ?? false,
      city: input.city ?? null,
      longitude: input.longitude ?? null,
      latitude: input.latitude ?? null,
      use_true_solar: input.useTrueSolar ?? true,
      sect: input.sect ?? 1,
    })
    .select('id, user_id, chart_snapshot, analysis_snapshot, engine_version')
    .single();
  if (error || !created) throw new Error(`建档失败: ${error?.message ?? '未知'}`);
  return created as ProfileSnapshot;
}

/** 盘面快照是否有效（有 chart_snapshot 且引擎版本匹配） */
export function isSnapshotValid(s: ProfileSnapshot | null): boolean {
  return !!s && !!s.chart_snapshot && s.engine_version === ENGINE_VERSION;
}

/** 存/更新盘面快照（chart + analysis） */
export async function saveProfileSnapshot(
  profileId: string,
  chart: unknown,
  analysis: unknown,
): Promise<void> {
  const supabase = createAdmin();
  await supabase
    .from('birth_profiles')
    .update({
      chart_snapshot: chart,
      analysis_snapshot: analysis,
      engine_version: ENGINE_VERSION,
      snapshot_at: new Date().toISOString(),
    })
    .eq('id', profileId);
}

/**
 * 读该 profile 最新一条 interpret 详批快照（含 classics）。无则 null。
 * 可选 persona/depth：传入时按该人格+深度组合精确查（interpret 缓存路径用，
 * 避免换人格/深度还命中旧组合的快照）。不传则取该盘最近一条（追问 context 复用用）。
 */
export async function findInterpretSnapshot(
  profileId: string,
  persona?: string,
  depth?: string,
): Promise<InterpretSnapshot | null> {
  const supabase = createAdmin();
  let query = supabase
    .from('interpretations')
    .select('id, birth_profile_id, content, classics_snapshot')
    .eq('birth_profile_id', profileId);
  if (persona) query = query.eq('persona', persona);
  if (depth) query = query.eq('depth', depth);
  const { data } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();
  return data as InterpretSnapshot | null;
}

/** 存 interpret 详批快照（全文 + 古籍）。已存在【同 profile + 同 persona + 同 depth】的则更新，否则插入。
 *  按 persona/depth 区分：scholar-standard 与 hermit-popular 各存一条，互不覆盖。 */
export async function saveInterpretSnapshot(
  profileId: string,
  userId: string,
  content: string,
  classics: unknown[],
  persona: string,
  depth: string,
): Promise<void> {
  const supabase = createAdmin();
  const existing = await findInterpretSnapshot(profileId, persona, depth);
  if (existing) {
    await supabase
      .from('interpretations')
      .update({
        content,
        classics_snapshot: classics,
        persona,
        depth,
        created_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    await supabase.from('interpretations').insert({
      user_id: userId,
      birth_profile_id: profileId,
      content,
      classics_snapshot: classics,
      persona,
      depth,
    });
  }
}
