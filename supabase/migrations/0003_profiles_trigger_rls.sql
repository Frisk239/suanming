-- supabase/migrations/0003_profiles_trigger_rls.sql
-- profiles 自动建行 trigger + 4 表 RLS（spec 3.2，M5 用户系统）。
--
-- ⚠️ 执行方式：Supabase Dashboard → SQL Editor → 粘贴全文 → Run。
--    DDL 走不了本机 7890 代理（M1 已知约束），只能 Dashboard 执行。
--    应用层查询（supabase-js REST）走代理正常。
--
-- 执行后：
--   1. 新注册用户自动在 profiles 建行（handle_new_user trigger）
--   2. 4 张表启用 RLS，用户只能读写自己的数据（knowledge_chunks 公开只读）
--
-- 对齐 0001_init.sql 的真实表/列名：
--   profiles(user_id, nickname) / birth_profiles(user_id) /
--   interpretations(user_id) / knowledge_chunks（无 user_id，公开语料）

-- ============================================================
-- 1. profiles 自动建行 trigger（注册时自动建 profiles 行）
-- ============================================================

-- 1a. trigger 函数：从 auth.users 插入 profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, nickname)
  values (new.id, coalesce(new.raw_user_meta_data->>'nickname', split_part(new.email, '@', 1)));
  return new;
end;
$$;

-- 1b. trigger：auth.users 插入后触发
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2. RLS：profiles（用户只能读写自己）
-- ============================================================
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = user_id);

-- ============================================================
-- 3. RLS：birth_profiles（用户只能 CRUD 自己的档案）
-- ============================================================
alter table public.birth_profiles enable row level security;

drop policy if exists "birth_profiles_select_own" on public.birth_profiles;
create policy "birth_profiles_select_own"
  on public.birth_profiles for select
  using (auth.uid() = user_id);

drop policy if exists "birth_profiles_insert_own" on public.birth_profiles;
create policy "birth_profiles_insert_own"
  on public.birth_profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "birth_profiles_update_own" on public.birth_profiles;
create policy "birth_profiles_update_own"
  on public.birth_profiles for update
  using (auth.uid() = user_id);

drop policy if exists "birth_profiles_delete_own" on public.birth_profiles;
create policy "birth_profiles_delete_own"
  on public.birth_profiles for delete
  using (auth.uid() = user_id);

-- ============================================================
-- 4. RLS：interpretations（用户只能 CRUD 自己的详批记录）
-- ============================================================
alter table public.interpretations enable row level security;

drop policy if exists "interpretations_select_own" on public.interpretations;
create policy "interpretations_select_own"
  on public.interpretations for select
  using (auth.uid() = user_id);

drop policy if exists "interpretations_insert_own" on public.interpretations;
create policy "interpretations_insert_own"
  on public.interpretations for insert
  with check (auth.uid() = user_id);

drop policy if exists "interpretations_delete_own" on public.interpretations;
create policy "interpretations_delete_own"
  on public.interpretations for delete
  using (auth.uid() = user_id);

-- ============================================================
-- 5. knowledge_chunks：公开只读（语料库，所有用户可检索，无人可写——经 service_role 维护）
-- ============================================================
alter table public.knowledge_chunks enable row level security;

drop policy if exists "knowledge_chunks_read_all" on public.knowledge_chunks;
create policy "knowledge_chunks_read_all"
  on public.knowledge_chunks for select
  using (true);  -- 公开可读；写操作仅 service_role（绕过 RLS）可做
