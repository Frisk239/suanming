// src/components/shell/AuthButton.tsx
// 右侧认证区（spec M5）。读 SessionProvider 下发的 session：
//   未登录 → 「登录 / 注册」
//   已登录 → 邮箱（进 /account）
// 登录/退登后 router.refresh() 触发根布局重取 session，本组件自动更新。

'use client';

import Link from 'next/link';
import { useSession } from '@/components/auth/SessionProvider';

export function AuthButton() {
  const { user } = useSession();

  if (user) {
    return (
      <Link
        href="/account"
        className="text-[13px] px-3.5 py-1.5 rounded-md border border-dai-qing-light/40 text-xuan-zhi/80 hover:border-hu-po-jin hover:text-hu-po-jin transition-colors truncate max-w-[12rem]"
        title={user.email}
      >
        {user.email}
      </Link>
    );
  }

  return (
    <Link
      href="/login"
      className="text-[13px] px-3.5 py-1.5 rounded-md border border-hu-po-jin text-hu-po-jin transition-colors hover:bg-hu-po-jin hover:text-dai-qing-dark"
    >
      登录 / 注册
    </Link>
  );
}
