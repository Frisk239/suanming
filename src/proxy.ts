// src/proxy.ts
// Supabase session 刷新（@supabase/ssr 标准）。
//
// Next 16 breaking change：middleware → proxy（文件名 + 函数名都改，见
// node_modules/next/dist/docs proxy.md「Migration to Proxy」）。Proxy 默认 Node runtime。
//
// 每次请求用 refresh_token 刷新 session cookie，保证 Server Component 能读到有效 session。
// 不强制登录（排盘免费，spec 5.3）——仅维持 session，登录门槛在 interpret route 内做（Task 9）。
// matcher 排除静态资源与图片。
//
// 网络说明：Supabase 国内可直连（实测稳定），无需代理。
// 早期误以为需翻墙加了 setupProxy，实测代理导致间歇性 UND_ERR_CONNECT_TIMEOUT，
// 故移除。详见 admin.ts 注释。

import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // 同步写 request + response，保证刷新后的 cookie 透传
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // getUser 触发 token 刷新；不强制登录，仅维持 session
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // 排除静态资源、图片、_next 内部路径
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico)$).*)'],
};
