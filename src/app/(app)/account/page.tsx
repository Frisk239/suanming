// src/app/(app)/account/page.tsx
// 「我的」页（spec M5 用户系统）。Server Component，服务端取 session。
//   未登录 → 引导去登录
//   已登录 → 显示邮箱 + 退出按钮

import Link from 'next/link';
import { getSession } from '@/lib/supabase/session';
import { signOut } from './actions';

export default async function AccountPage() {
  const user = await getSession();

  if (!user) {
    return (
      <main className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
        <h1 className="font-serif-display text-2xl tracking-widest text-xuan-zhi mb-3">
          未 登 录
        </h1>
        <p className="text-sm text-xuan-zhi/50 mb-6">
          登录后可使用 AI 详批，并保存你的命盘档案
        </p>
        <Link
          href="/login"
          className="px-6 py-2 rounded border border-hu-po-jin text-hu-po-jin hover:bg-hu-po-jin hover:text-dai-qing-dark transition-colors font-serif-display tracking-widest text-sm"
        >
          去 登 录
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-lg border border-dai-qing-light/30 bg-dai-qing-dark/60 backdrop-blur p-8">
        <h1 className="font-serif-display text-2xl tracking-[0.2em] text-xuan-zhi mb-1">
          我 的
        </h1>
        <p className="text-xs text-xuan-zhi/50 tracking-wide mb-6">已登录</p>

        <dl className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-dai-qing-light/20 pb-2">
            <dt className="text-xuan-zhi/50">邮箱</dt>
            <dd className="text-xuan-zhi">{user.email}</dd>
          </div>
        </dl>

        <form action={signOut}>
          <button
            type="submit"
            className="w-full mt-8 py-2 border border-dai-qing-light/40 rounded text-sm text-xuan-zhi/70 hover:border-vermillion hover:text-vermillion transition-colors"
          >
            退出登录
          </button>
        </form>

        <p className="mt-6 text-xs text-xuan-zhi/40 text-center leading-relaxed">
          仅作文化研究与体验，不构成任何决策建议
        </p>
      </div>
    </main>
  );
}
