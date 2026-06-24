// src/app/(app)/account/SignOutButton.tsx
// 退出登录（客户端组件）。
//
// 退出改客户端实现：浏览器 client signOut 直接清 document.cookie，可靠。
// 不用 Server Action + redirect——后者在 Turbopack 下 signOut 设置的
// 清除-cookie 响应头会被 redirect 中获丢弃，致残留过期 token、退出后登不上。

'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function SignOutButton() {
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  const handle = async () => {
    setBusy(true);
    try {
      await supabase.auth.signOut();
    } catch {
      // 即使 signOut 报错也继续跳转（本地 session 已无意义）
    }
    // 整页跳转首页：强制根布局重新 SSR 取 session（client router.refresh
    // 不会更新 SessionProvider 的静态 prop，TopNav 不会刷新登录态）。
    // 退出直接回首页，不显示 account 未登录页。
    window.location.href = '/';
  };

  return (
    <button
      type="button"
      onClick={handle}
      disabled={busy}
      className="w-full flex items-center justify-between py-2 text-sm text-dai-qing/70 hover:text-vermillion transition-colors disabled:opacity-50"
    >
      <span className="font-serif tracking-wide">{busy ? '退 出 中…' : '退 出 登 录'}</span>
      <span className="text-[11px] text-dai-qing/40">清除本机会话</span>
    </button>
  );
}
