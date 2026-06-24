// src/app/login/page.tsx
// 登录/注册页（spec M5 用户系统）。
//
// 独立路由（不在 (app) 组内）——避免登录页自身再显示导航壳的「登录」按钮，保持独立感。
// 顶部仅一个返回链接。

import Link from 'next/link';
import { LoginCard } from '@/components/auth/LoginCard';

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <Link
        href="/"
        className="self-start mb-8 text-sm text-xuan-zhi/50 hover:text-hu-po-jin"
      >
        ← 返回
      </Link>
      <LoginCard />
      <p className="mt-8 text-xs text-xuan-zhi/40 max-w-sm text-center leading-relaxed">
        仅作文化研究与体验，不构成任何决策建议
      </p>
    </main>
  );
}
