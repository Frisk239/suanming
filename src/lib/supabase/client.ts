// src/lib/supabase/client.ts
//
// 浏览器端 Supabase client（带 session，用 @supabase/ssr）。
// 用 NEXT_PUBLIC_ 前缀的 anon key（可暴露到前端）。

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
