// src/components/auth/LoginCard.tsx
// 登录/注册卡片（12-login.html 1:1 照抄，spec M5 用户系统）。
//
// 纯邮箱+密码登录（浏览器 client @supabase/ssr）。登入/注册 tab 切换，
// 邮箱确认已在 Supabase 后台关闭——注册即登录，不发邮件（消除 rate limit）。
// 登录成功后整页跳转首页，强制根布局 SSR 重取 session（见下方说明）。
//
// 视觉严格对齐 12-login.html（max-width 420px / padding 40px 32px 32px / 各间距原值）。

'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function LoginCard() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const supabase = createClient();

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      const { error } =
        mode === 'signin'
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });
      if (error) throw error;
      // 注册即登录（邮箱确认已在 Supabase 后台关闭，不发邮件）。
      // 整页跳转首页：强制根布局重新 SSR 取 session，TopNav 登录态同步刷新。
      // 不能用 client router.refresh（SessionProvider 的 user prop 来自服务端，
      // client 跳转不会重新下发，TopNav 仍显示「登录/注册」）。
      window.location.href = '/';
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };

  // tab 切换：登入→故人重入，注册→新缘初结
  const subText = mode === 'signin' ? '故 人 重 入' : '新 缘 初 结';
  const submitLabel = mode === 'signin' ? '登 入' : '注 册';
  const switchLabel = mode === 'signin' ? '还没有账号？' : '已有账号？';
  const switchBtn = mode === 'signin' ? '前往注册' : '前往登入';

  return (
    <div className="login-wrap relative z-[2] w-full max-w-[420px]">
      {/* 品牌标题：拜帖 / 入青囊 */}
      <div className="brand-title text-center mb-1">
        <span className="block font-serif text-[11px] tracking-[0.4em] text-hu-po-jin/60 mb-2">
          拜 帖
        </span>
        <span className="qn-glow-breathe font-serif text-[28px] tracking-[0.3em] text-hu-po-jin">
          入 青 囊
        </span>
      </div>

      {/* 双层框登录卡片 */}
      <div className="card-wrap relative">
        <div className="login-card relative mt-9 bg-xuan-zhi-warm border border-dai-qing/15 rounded-md overflow-hidden shadow-[0_30px_90px_-24px_rgba(0,26,26,0.55),0_8px_28px_-12px_rgba(0,51,51,0.28)] pt-10 px-8 pb-8">
          {/* 内层琥珀金细边 inset 7px */}
          <span className="pointer-events-none absolute inset-[7px] z-20 rounded border border-hu-po-jin/20" />

          {/* 登入/注册 tab（墨痕下划线） */}
          <div className="relative flex border-b border-dai-qing/10 mt-6">
            {(['signin', 'signup'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`relative flex-1 pt-1 pb-3 bg-transparent border-0 cursor-pointer font-serif text-[17px] tracking-[0.3em] transition-colors ${
                  mode === m
                    ? 'text-dai-qing after:content-[""] after:absolute after:left-[24%] after:right-[24%] after:-bottom-px after:h-0.5 after:rounded-full after:bg-hu-po-jin after:shadow-[0_0_8px_rgba(212,175,55,0.45)]'
                    : 'text-dai-qing/35 hover:text-dai-qing/60'
                }`}
              >
                {m === 'signin' ? '登 入' : '注 册'}
              </button>
            ))}
          </div>

          {/* 副标题 */}
          <p className="mt-4 text-center text-[11px] tracking-[0.25em] text-dai-qing/70 font-serif">
            {subText}
          </p>

          {/* 表单（墨线输入） */}
          <form onSubmit={handlePassword} className="mt-7">
            <div className="mb-6">
              <label className="block text-[10px] tracking-[0.3em] text-dai-qing/70 mb-1">
                邮 箱
              </label>
              <InkLine
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
              />
            </div>
            <div className="mb-6">
              <label className="block text-[10px] tracking-[0.3em] text-dai-qing/70 mb-1">
                密 码
              </label>
              <InkLine
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="设置密码（至少 6 位）"
                showToggle
              />
            </div>

            {/* 登入按钮：黛青底 + 玄纸字 + 光泽扫过 */}
            <button
              type="submit"
              disabled={busy}
              className="qn-sheen-sweep relative w-full mt-2 py-3.5 px-8 bg-dai-qing text-xuan-zhi-warm border-0 rounded-[14px] overflow-hidden font-serif text-[15px] tracking-[0.3em] shadow-[0_4px_14px_rgba(0,77,77,0.18)] transition-all hover:bg-dai-qing-dark hover:-translate-y-px disabled:opacity-50"
            >
              {busy ? '处 理 中…' : submitLabel}
            </button>
          </form>

          {/* 切换提示 */}
          <p className="mt-5 text-center text-[13px] text-dai-qing/50">
            {switchLabel}{' '}
            <button
              type="button"
              onClick={() => setMode((m) => (m === 'signin' ? 'signup' : 'signin'))}
              className="bg-transparent border-0 text-hu-po-jin-dark text-[13px] cursor-pointer hover:text-hu-po-jin hover:underline"
            >
              {switchBtn}
            </button>
          </p>

          {/* 错误/成功提示 */}
          {err && <p className="mt-3.5 text-center text-[13px] text-vermillion">{err}</p>}
          {msg && <p className="mt-3.5 text-center text-[13px] text-hu-po-jin-dark">{msg}</p>}
        </div>

        {/* 朱砂印「青囊」：card-wrap 内、卡片外，z:50 压过金边 */}
        <div className="absolute -top-4 right-7 z-50 flex rotate-[-4deg] flex-col gap-[3px] rounded bg-[var(--seal-red)] px-[7px] py-2 font-serif text-[13px] font-semibold leading-none text-[#f7f2e7] shadow-[inset_0_0_0_1.5px_rgba(247,242,231,0.5),inset_0_0_10px_rgba(63,12,8,0.3),0_2px_10px_rgba(168,57,46,0.22)]">
          <span>青</span>
          <span>囊</span>
        </div>
      </div>
    </div>
  );
}

/**
 * 墨线下划线输入（qn-inkline，12-login.html 招牌样式）。
 * 透明背景 + 底部细线，focus 时琥珀金高亮线展开。
 * 严格照原型：input padding 10px 4px，ink 高亮线 height 1.5px。
 */
function InkLine({
  type,
  value,
  onChange,
  placeholder,
  showToggle,
}: {
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  showToggle?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const inputType = showToggle ? (visible ? 'text' : 'password') : type;
  return (
    <span className="relative block">
      <input
        type={inputType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className="w-full bg-transparent border-0 border-b border-dai-qing/15 outline-none px-1 py-2.5 pr-8 text-dai-qing text-[15px] placeholder:text-dai-qing/25 focus:border-b-transparent transition-colors"
      />
      {/* 明文切换小眼睛（仅密码框） */}
      {showToggle && (
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? '隐藏密码' : '显示密码'}
          className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-dai-qing/40 hover:text-hu-po-jin-dark transition-colors"
        >
          {visible ? (
            // 睁眼
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          ) : (
            // 闭眼
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          )}
        </button>
      )}
      <span
        className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-hu-po-jin to-hu-po-jin/30 origin-left transition-transform duration-300"
        style={{ transform: focused ? 'scaleX(1)' : 'scaleX(0)' }}
      />
    </span>
  );
}
