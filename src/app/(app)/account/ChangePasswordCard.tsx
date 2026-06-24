// src/app/(app)/account/ChangePasswordCard.tsx
// 修改密码（客户端组件）。
// 走浏览器 client updateUser({password})，Supabase 默认不要求旧密码
// （前提：用户最近登录过，session 有效）。新密码至少 6 位。

'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function ChangePasswordCard() {
  const [open, setOpen] = useState(false);
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const supabase = createClient();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setMsg('');
    if (pwd.length < 6) {
      setErr('密码至少 6 位');
      return;
    }
    if (pwd !== pwd2) {
      setErr('两次输入不一致');
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd });
      if (error) throw error;
      setMsg('密码已更新');
      setPwd('');
      setPwd2('');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : '更新失败');
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between py-2 text-sm text-dai-qing/70 hover:text-hu-po-jin-dark transition-colors"
      >
        <span className="font-serif tracking-wide">修 改 密 码</span>
        <span className="text-[11px] text-dai-qing/40">设置新密码 ▾</span>
      </button>
    );
  }

  return (
    <div className="py-3">
      <form onSubmit={submit} className="space-y-3">
        <input
          type="password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          placeholder="新密码（至少 6 位）"
          className="w-full bg-transparent border border-dai-qing/20 rounded-md px-3 py-2 text-sm text-dai-qing placeholder:text-dai-qing/30 focus:border-hu-po-jin outline-none transition-colors"
        />
        <input
          type="password"
          value={pwd2}
          onChange={(e) => setPwd2(e.target.value)}
          placeholder="确认新密码"
          className="w-full bg-transparent border border-dai-qing/20 rounded-md px-3 py-2 text-sm text-dai-qing placeholder:text-dai-qing/30 focus:border-hu-po-jin outline-none transition-colors"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="flex-1 py-2 rounded-md bg-dai-qing text-xuan-zhi-warm text-sm font-serif tracking-wide hover:bg-dai-qing-dark transition-colors disabled:opacity-50"
          >
            {busy ? '更新中…' : '确认修改'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-4 py-2 rounded-md border border-dai-qing/20 text-sm text-dai-qing/60 hover:text-dai-qing transition-colors"
          >
            取消
          </button>
        </div>
      </form>
      {err && <p className="mt-2 text-xs text-vermillion">{err}</p>}
      {msg && <p className="mt-2 text-xs text-hu-po-jin-dark">{msg}</p>}
    </div>
  );
}
