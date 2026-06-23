-- supabase/migrations/0001_init.sql
-- 初始建表（spec 第 3.2 节）。
-- M1 只建表，不写 trigger 和 RLS（trigger/RLS 在 M5 用户系统阶段再加）。
--
-- 执行方式：Supabase Dashboard → SQL Editor → 粘贴全文 → Run。
-- 执行后 Table Editor 应出现 4 张表：
--   profiles / birth_profiles / interpretations / knowledge_chunks

-- 启用 pgvector 扩展（knowledge_chunks.embedding 需要）
create extension if not exists vector;

-- 用户配置（注册时用 trigger 自动建行；M1 不建 trigger，仅建表）
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  nickname text,
  default_persona text default 'scholar',  -- scholar | hermit
  default_depth text default 'standard',    -- standard | popular
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 出生档案（统一存公历，is_lunar 仅记录原始输入形式）
create table if not exists birth_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text,
  gender text,                            -- male | female
  birth_date date,                        -- 公历日期（农历输入时先转公历再存）
  birth_time text,                        -- "22:37"
  is_lunar boolean default false,         -- 原始输入是否农历（UI 回显用）
  city text,
  longitude float,
  latitude float,
  use_true_solar boolean default true,
  sect int default 1,
  is_default boolean default false,
  created_at timestamptz default now()
);

-- AI 详批记录（③层 interpret 产出存档，存全量 JSONB 快照）
create table if not exists interpretations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  birth_profile_id uuid references birth_profiles(id),
  chart_input jsonb,                      -- 排盘入参快照
  chart_result jsonb,                     -- 排盘结果快照（算法升级后仍可追溯）
  analysis_result jsonb,                  -- ②层解读结果快照
  persona text,                           -- scholar | hermit
  depth text,                             -- standard | popular
  content text,                           -- LLM 生成的长文
  llm_model text,                         -- 用的哪个 chat 模型
  created_at timestamptz default now()
);

-- RAG 语料向量表（ETL 和检索见 spec 第 4 节，M3 阶段填充）
create table if not exists knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  book text,                              -- 书名 "滴天髓阐微"
  chapter text,                           -- 章节
  category text,                          -- "原文" | "概念" | "调候"
  content text,                           -- 文本块
  translation text,                       -- 白话（可选）
  embedding vector(1024),                 -- BGE-M3，1024 维
  created_at timestamptz default now()
);
