// src/lib/supabase/admin.ts
//
// 服务端 admin client（用 service_role key，绕过 RLS）。
// ⚠️ 仅在 Route Handler / Server Component 用，绝不暴露到前端 bundle。
// service_role key 等同于数据库 root，务必保密。
//
// 网络说明：Supabase 国内可直连（实测 0.6s 稳定），无需代理。
// 早期误以为需翻墙加了 setupProxy，实测代理反而导致间歇性 UND_ERR_CONNECT_TIMEOUT，
// 故移除。若未来部署到需代理的环境，再按需恢复。

import { createClient } from '@supabase/supabase-js';

export function createAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
