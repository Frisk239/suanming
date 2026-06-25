// src/lib/concurrency.ts
// 并发保护（spec 6.2/6.3）：防软上线百级用户突发把 4 核打爆。
// 单进程内存实现（不上 Redis），要求 next-app 单实例常驻（软上线单机部署契合）。
//   - acquire/release：同 user+profile 锁，防同用户连点（A 类）。
//   - tryAcquireGlobal/releaseGlobal：全局在途上限，防多用户突发（B 类）。

const inFlight = new Map<string, true>(); // key = `${userId}:${profileId}`

/** 同 user+profile：首次返回 true，未 release 前再调返回 false（→ 409） */
export function acquire(userId: string, profileId: string): boolean {
  const key = `${userId}:${profileId}`;
  if (inFlight.has(key)) return false;
  inFlight.set(key, true);
  return true;
}

export function release(userId: string, profileId: string): void {
  inFlight.delete(`${userId}:${profileId}`);
}

const GLOBAL_LIMIT = 4; // 4核能扛的 embed+LLM 并发上限
let globalInFlight = 0;

/** 全局在途：未达上限返回 true 并 +1，达上限返回 false（→ 429） */
export function tryAcquireGlobal(): boolean {
  if (globalInFlight >= GLOBAL_LIMIT) return false;
  globalInFlight++;
  return true;
}

export function releaseGlobal(): void {
  globalInFlight--;
  if (globalInFlight < 0) globalInFlight = 0; // 防御性，避免负数
}

/** 仅测试用：重置所有状态 */
export function __resetForTest(): void {
  inFlight.clear();
  globalInFlight = 0;
}
