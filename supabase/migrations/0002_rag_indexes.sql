-- supabase/migrations/0002_rag_indexes.sql
-- pgvector 检索索引 + 相似度查询 RPC。
-- 执行方式：Supabase Dashboard → SQL Editor → 粘贴 → Run。
-- 注意：DDL（建索引/函数）走不了 HTTP 代理，只能去 Dashboard 执行（M1 已知前提）。

-- ivfflat 索引（余弦距离）。lists 取 sqrt(rows) 经验值，M3 建库后可调。
-- 注：ivfflat 需先有数据再建索引才准确；建库脚本（build-rag.ts）跑完后再执行本 SQL。
create index if not exists knowledge_chunks_embedding_idx
  on knowledge_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- 相似度查询 RPC（供 supabase.rpc('match_knowledge', {...}) 调用）
create or replace function match_knowledge(
  query_embedding vector(1024),
  match_count int default 8,
  filter_category text default null
)
returns table (
  id uuid,
  book text,
  chapter text,
  category text,
  content text,
  translation text,
  similarity float
)
language sql
stable
as $$
  select
    id, book, chapter, category, content, translation,
    1 - (embedding <=> query_embedding) as similarity
  from knowledge_chunks
  where (filter_category is null or category = filter_category)
  order by embedding <=> query_embedding
  limit match_count;
$$;
