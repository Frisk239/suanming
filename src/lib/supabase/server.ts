// src/lib/supabase/server.ts
// 服务端 Supabase client（@supabase/ssr createServerClient）。
//
// 用于 Server Component / Route Handler / Server Action，读请求 cookie 维持 session。
// 与 admin.ts（service_role 绕过 RLS）区分：这个用 anon key + 用户 session，受 RLS 约束。
//
// Next 16 注意：cookies() 是 async，必须 await（v15.0.0-RC 起，docs 确认）。
//
// 网络说明：Supabase 国内可直连（实测稳定），无需代理。见 admin.ts 注释。

import { createServerClient as createSSRClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerClient() {
  const cookieStore = await cookies();
  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // 在 Server Component 调 set 会抛（只读）；middleware 负责刷新，忽略即可
          }
        },
      },
    },
  );
}
