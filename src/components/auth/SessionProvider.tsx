// src/components/auth/SessionProvider.tsx
// 客户端 session Context（spec M5 用户系统）。
//
// 根布局（Server Component，Task 6）服务端取 session 后下发，
// TopNav/AuthButton 等客户端组件用 useSession() 读登录态，
// 避免每处各自请求。登录/退登后 router.refresh() 触发重取。

'use client';

import { createContext, useContext } from 'react';

export interface SessionUser {
  id: string;
  email: string;
}

export interface SessionState {
  user: SessionUser | null;
}

const SessionContext = createContext<SessionState>({ user: null });

export function SessionProvider({
  user,
  children,
}: {
  user: SessionUser | null;
  children: React.ReactNode;
}) {
  return (
    <SessionContext.Provider value={{ user }}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionState {
  return useContext(SessionContext);
}
