// src/components/shell/AuthButton.tsx
// 右侧认证区（spec M5）。Task 3 先做占位：始终显示「登录 / 注册」。
// Task 6 接入 SessionProvider 后改为读 session：未登录→「登录/注册」；已登录→邮箱（进 /account）。
//
// 样式（03-nav-and-cards.html 实测）：琥珀金描边胶囊，hover 填充琥珀金。

'use client';

import Link from 'next/link';

export function AuthButton() {
  return (
    <Link
      href="/login"
      className="text-[13px] px-3.5 py-1.5 rounded-md border border-hu-po-jin text-hu-po-jin transition-colors hover:bg-hu-po-jin hover:text-dai-qing-dark"
    >
      登录 / 注册
    </Link>
  );
}
