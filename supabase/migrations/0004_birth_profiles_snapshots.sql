-- supabase/migrations/0004_birth_profiles_snapshots.sql
-- M7 Phase 1：排盘结果持久化（页面秒开 + 为追问提供事实底座）。
--
-- 执行方式：Supabase Dashboard → SQL Editor → 粘贴全文 → Run。
--
-- 数据模型决策（发现1=A，复用 interpretations 表避免重复造轮子）：
--   - birth_profiles 加盘面快照（chart_snapshot/analysis_snapshot）—— 排盘秒开用，
--     直接挂在 profile 上查询最简；engine_version 控制快照失效（②层引擎升级后旧快照重算）。
--   - interpretations 表已存在（0001_init.sql），已有 chart_result/analysis_result/content，
--     复用存 interpret 全文，仅补 classics_snapshot（解读时检索的古籍，追问复用）。
--
-- 快照失效（spec 4.3）：engine_version 存当前引擎版本，②层引擎升级版本号变，
-- 旧快照 engine_version 不匹配 → 用户重排时自动重算（无感）。

-- birth_profiles：盘面 + ②层解读快照（秒开用）
alter table public.birth_profiles
  add column if not exists chart_snapshot jsonb,       -- 排盘结果（四柱/藏干/五行分/大运）
  add column if not exists analysis_snapshot jsonb,    -- ②层解读（strength/pattern/yongshen）
  add column if not exists engine_version text,        -- 引擎版本号（失效控制）
  add column if not exists snapshot_at timestamptz;    -- 快照时间

-- interpretations：补 classics_snapshot（解读时检索的古籍，追问复用，避免重检索）
alter table public.interpretations
  add column if not exists classics_snapshot jsonb;    -- 解读时 RAG 检索的古籍快照

-- 索引：按 user_id 查 birth_profiles（追问 API 会频繁按 profileId 查）
create index if not exists birth_profiles_user_id_idx on public.birth_profiles(user_id);
