// src/lib/supabase/admin.ts
//
// 服务端 admin client（用 service_role key，绕过 RLS）。
// ⚠️ 仅在 Route Handler / Server Component 用，绝不暴露到前端 bundle。
// service_role key 等同于数据库 root，务必保密。

import { createClient } from '@supabase/supabase-js';
import { setupProxy } from './proxy';

export function createAdmin() {
  setupProxy(); // 让服务端 fetch 走 HTTPS_PROXY（本机翻墙用，生产无此变量则直连）
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
