// src/app/(app)/account/page.tsx
// 「我的」页（青囊 /profile 骨架复刻，spec M5 用户系统）。
// Server Component，服务端取 session + 查 profiles 真实数据。
//
// 只展示真实有数据的内容（不写死）：
//   - 己之所在：nickname(从 profiles 读) + email + 入户/已伴天数(从 created_at 算)
//   - 安全：登录邮箱 + 修改密码 + 退出
// 命盘(birth_profiles 空)、偏好(MVP 不做设置 UI)暂不展示，待功能落地再加。

import Link from 'next/link';
import { getSession } from '@/lib/supabase/session';
import { createServerClient } from '@/lib/supabase/server';
import { ChangePasswordCard } from './ChangePasswordCard';
import { SignOutButton } from './SignOutButton';

/** section 标题：中文衬线 + 英文小字副标题（青囊实测样式） */
function SectionTitle({ zh, en }: { zh: string; en: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-serif text-base text-dai-qing">{zh}</h2>
      <p className="mt-0.5 text-[10px] tracking-[0.25em] text-hu-po-jin/55">{en}</p>
    </div>
  );
}

/** 从 created_at 算「已伴 X 日」 */
function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(1, Math.floor(ms / 86400000));
}

export default async function AccountPage() {
  const user = await getSession();

  // 未登录
  if (!user) {
    return (
      <main className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center bg-xuan-zhi-warm">
        <div className="font-serif text-3xl tracking-[0.3em] text-hu-po-jin mb-2">
          己 之 所 在
        </div>
        <p className="text-[10px] tracking-[0.25em] text-hu-po-jin/55 mb-8">ACCOUNT</p>
        <p className="text-sm text-dai-qing/60 mb-8 max-w-xs leading-relaxed">
          登录后可建立命盘档案，使用 AI 详批
        </p>
        <Link
          href="/login"
          className="px-8 py-3 rounded-[14px] bg-dai-qing text-xuan-zhi-warm font-serif text-sm tracking-[0.3em] shadow-[0_4px_14px_rgba(0,77,77,0.18)] hover:bg-dai-qing-dark transition-colors"
        >
          入 青 囊
        </Link>
      </main>
    );
  }

  // 查 profiles 真实数据（nickname + created_at）。trigger 保证注册即建行。
  const supabase = await createServerClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname, created_at')
    .eq('user_id', user.id)
    .maybeSingle();

  const nickname = profile?.nickname ?? user.email.split('@')[0];
  const createdAt = profile?.created_at;
  const initial = nickname.charAt(0).toUpperCase();
  const days = createdAt ? daysSince(createdAt) : null;
  const joinDate = createdAt
    ? new Date(createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })
    : null;

  return (
    <main className="min-h-screen bg-xuan-zhi-warm pt-16 pb-12 px-4">
      <div className="max-w-md mx-auto space-y-8">
        {/* ===== 己之所在（用户卡片，数据来自 profiles）===== */}
        <section>
          <div className="text-center">
            <p className="text-[10px] tracking-[0.4em] text-hu-po-jin/60 mb-1">
              己 · 之 所 在
            </p>
          </div>
          <div className="flex flex-col items-center mt-4">
            <div className="w-16 h-16 rounded-full bg-dai-qing text-xuan-zhi-warm flex items-center justify-center font-serif text-2xl shadow-[0_4px_14px_rgba(0,77,77,0.25)]">
              {initial}
            </div>
            <div className="mt-3 font-serif text-lg text-dai-qing tracking-wide">
              {nickname}
            </div>
            <div className="mt-1 text-xs text-dai-qing/50">{user.email}</div>
            {joinDate && days !== null && (
              <p className="mt-2 text-[11px] text-dai-qing/40">
                入户 {joinDate}，已伴 {days} 日
              </p>
            )}
          </div>
        </section>

        {/* ===== 安全（修改密码 + 退出，真实功能）===== */}
        <section className="rounded-2xl border border-dai-qing/10 bg-xuan-zhi p-6">
          <SectionTitle zh="安全" en="ACCOUNT · SECURITY" />
          <div className="space-y-1">
            <div className="flex items-center justify-between py-2">
              <span className="text-xs tracking-[0.2em] text-dai-qing/60">登 录 邮 箱</span>
              <span className="text-sm text-dai-qing">{user.email}</span>
            </div>
            <div className="border-t border-dai-qing/10">
              <ChangePasswordCard />
            </div>
            <div className="border-t border-dai-qing/10">
              <SignOutButton />
            </div>
          </div>
        </section>

        <p className="text-center text-[11px] text-dai-qing/35 leading-relaxed pt-2">
          仅作文化研究与体验，不构成任何决策建议
        </p>
      </div>
    </main>
  );
}
