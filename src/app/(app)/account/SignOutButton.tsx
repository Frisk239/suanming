// src/app/(app)/account/SignOutButton.tsx
// 退出登录（客户端组件）。
//
// 退出改客户端实现：浏览器 client signOut 直接清 document.cookie，可靠。
// 不用 Server Action + redirect——后者在 Turbopack 下 signOut 设置的
// 清除-cookie 响应头会被 redirect 中获丢弃，致残留过期 token、退出后登不上。

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  const handle = async () => {
    setBusy(true);
    try {
      await supabase.auth.signOut();
    } catch {
      // 即使 signOut 报错也继续跳转（本地 session 已无意义）
    }
    // refresh 让根布局重取 session（变回未登录），再跳首页
    router.refresh();
    router.replace('/');
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
