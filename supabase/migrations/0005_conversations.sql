-- supabase/migrations/0005_conversations.sql
-- M7 Phase 2：追问会话表（一盘一会话，spec 5.1）。
--
-- 执行方式：Supabase Dashboard → SQL Editor → 粘贴全文 → Run。
--
-- 数据模型：
--   messages jsonb：[{role:'user'|'assistant', content, tokens, created_at}]
--   summary jsonb：压缩摘要 {topics, conclusions, focusPoints}（超 100K 压缩后存）
--   summary_until_idx：messages 哪个下标之前已压进 summary（压缩推进游标）
--   unique(user_id, profile_id)：一盘一会话
-- RLS：用户只能 CRUD 自己的会话（对齐 0003 profiles RLS 模式）。

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  profile_id uuid references public.birth_profiles(id) on delete cascade not null,
  messages jsonb default '[]'::jsonb,          -- 对话记录（压缩层）
  summary jsonb,                                -- 压缩摘要 {topics, conclusions, focusPoints}
  summary_until_idx int default 0,              -- messages 已压缩到哪个下标
  message_count int default 0,
  total_tokens int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, profile_id)                   -- 一盘一会话
);

-- 索引：按 profile_id 查会话（追问 API 主查询路径）
create index if not exists conversations_profile_id_idx on public.conversations(profile_id);

-- RLS：用户只能 CRUD 自己的会话
alter table public.conversations enable row level security;

drop policy if exists "conversations_select_own" on public.conversations;
create policy "conversations_select_own" on public.conversations
  for select using (auth.uid() = user_id);

drop policy if exists "conversations_insert_own" on public.conversations;
create policy "conversations_insert_own" on public.conversations
  for insert with check (auth.uid() = user_id);

drop policy if exists "conversations_update_own" on public.conversations;
create policy "conversations_update_own" on public.conversations
  for update using (auth.uid() = user_id);

drop policy if exists "conversations_delete_own" on public.conversations;
create policy "conversations_delete_own" on public.conversations
  for delete using (auth.uid() = user_id);
