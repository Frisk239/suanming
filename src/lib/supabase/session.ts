// src/lib/supabase/session.ts
// session 辅助（spec M5 用户系统）。
//
// getSession 取当前用户（不抛），requireUser 要求登录否则抛 AuthError。
// Route Handler（interpret 门槛 Task 9）与 Server Component（account Task 7、
// 根布局 Task 6）复用。

import { createServerClient } from './server';

export interface AuthUser {
  id: string;
  email: string;
}

/** 未登录标记错误（requireUser 抛出，供调用方 try/catch 区分） */
export class AuthError extends Error {
  constructor(message = '未登录') {
    super(message);
    this.name = 'AuthError';
  }
}

/** 取当前登录用户；未登录/出错返回 null（不抛） */
export async function getSession(): Promise<AuthUser | null> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    return { id: user.id, email: user.email ?? '' };
  } catch {
    return null;
  }
}

/** 要求登录，否则抛 AuthError（供 API 路由做门槛） */
export async function requireUser(): Promise<AuthUser> {
  const user = await getSession();
  if (!user) throw new AuthError();
  return user;
}
