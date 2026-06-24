// src/components/auth/LoginCard.tsx
// 登录/注册卡片（spec M5 用户系统）。
//
// 三种方式都走浏览器 client（src/lib/supabase/client.ts，@supabase/ssr）：
//   ① 邮箱+密码：登录 / 注册（注册即自动登录，若未开邮箱确认）
//   ② 魔法链接：发邮件，点链接走 /auth/callback 兑换 session
// 成功后 router.refresh() 触发 Server Component 重取 session。
//
// 样式：华彩深底卡片（玄纸字 + 琥珀金按钮 + 墨线输入复用 .input）。

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function LoginCard() {
  const router = useRouter();
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
      if (mode === 'signup') {
        setMsg('注册成功，请查收确认邮件（若已启用邮箱确认）');
      } else {
        router.refresh(); // 触发 Server Component 重取 session
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setErr('请先填写邮箱');
      return;
    }
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${location.origin}/auth/callback` },
      });
      if (error) throw error;
      setMsg('魔法链接已发送至邮箱，请查收并点击链接登录');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : '发送失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto rounded-lg border border-dai-qing-light/30 bg-dai-qing-dark/60 backdrop-blur p-8">
      <h1 className="font-serif-display text-2xl tracking-[0.2em] text-xuan-zhi text-center mb-1">
        入 青 囊
      </h1>
      <p className="text-xs text-xuan-zhi/50 text-center tracking-wide mb-6">
        登录后可使用 AI 详批，排盘无需登录
      </p>

      <form onSubmit={handlePassword} className="space-y-3">
        <input
          type="email"
          required
          placeholder="邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input w-full"
        />
        <input
          type="password"
          required
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input w-full"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full py-2 bg-hu-po-jin text-dai-qing-dark rounded font-serif-display tracking-widest hover:bg-hu-po-jin-light transition-colors disabled:opacity-50"
        >
          {mode === 'signin' ? '登 录' : '注 册'}
        </button>
      </form>

      <button
        onClick={handleMagicLink}
        disabled={busy}
        className="w-full mt-3 py-2 border border-dai-qing-light/40 rounded text-sm text-xuan-zhi/70 hover:border-hu-po-jin hover:text-hu-po-jin transition-colors disabled:opacity-50"
      >
        发送魔法链接
      </button>

      <div className="mt-4 text-center text-sm">
        <button
          onClick={() => setMode((m) => (m === 'signin' ? 'signup' : 'signin'))}
          className="text-hu-po-jin hover:underline"
        >
          {mode === 'signin' ? '没有账号？去注册' : '已有账号？去登录'}
        </button>
      </div>

      {err && <p className="mt-4 text-sm text-vermillion text-center">{err}</p>}
      {msg && <p className="mt-4 text-sm text-hu-po-jin text-center">{msg}</p>}
    </div>
  );
}
