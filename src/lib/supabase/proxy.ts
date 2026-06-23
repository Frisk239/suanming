// src/lib/supabase/proxy.ts
//
// @supabase/supabase-js 在 Node 默认不读 HTTPS_PROXY/HTTP_PROXY 环境变量。
// 这里用 undici 的 EnvHttpProxyAgent 注册全局 dispatcher，让服务端 fetch
// 自动走代理（读环境变量，不写死地址）。
//
// 触发条件：仅当存在 HTTPS_PROXY / HTTP_PROXY 环境变量时才启用。
//   - 本机开发（需翻墙连 Supabase）：.env.local 设 HTTPS_PROXY=http://127.0.0.1:7890
//   - Vercel 生产：不设该变量 → 直连，零影响
//
// 注意：setGlobalDispatcher 是进程级的，会影响整个 Node 进程的 fetch（含 next dev
// 的其他外部请求）。这对"本机全走代理"的场景正是预期行为。

import { EnvHttpProxyAgent, setGlobalDispatcher } from 'undici';

let initialized = false;

/**
 * 注册代理（幂等）。仅服务端调用。
 * 无代理环境变量时为空操作。
 */
export function setupProxy(): void {
  if (initialized) return;
  initialized = true;
  if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) {
    setGlobalDispatcher(new EnvHttpProxyAgent());
  }
}
