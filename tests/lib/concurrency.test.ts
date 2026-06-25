// tests/lib/concurrency.test.ts
// 并发保护单测（spec 6.2/6.3）：同用户同盘 409 + 全局 429，单进程内存。

import { describe, it, expect, beforeEach } from 'vitest';
import {
  acquire,
  release,
  tryAcquireGlobal,
  releaseGlobal,
  __resetForTest,
} from '@/lib/concurrency';

beforeEach(() => {
  __resetForTest();
});

describe('concurrency · 同用户同盘锁', () => {
  it('首次 acquire 成功', () => {
    expect(acquire('u1', 'p1')).toBe(true);
  });

  it('同一 user+profile 第二次 acquire 失败', () => {
    expect(acquire('u1', 'p1')).toBe(true);
    expect(acquire('u1', 'p1')).toBe(false);
  });

  it('不同 profile 互不影响', () => {
    expect(acquire('u1', 'p1')).toBe(true);
    expect(acquire('u1', 'p2')).toBe(true);
  });

  it('release 后可再次 acquire', () => {
    acquire('u1', 'p1');
    release('u1', 'p1');
    expect(acquire('u1', 'p1')).toBe(true);
  });
});

describe('concurrency · 全局限流', () => {
  it('未达上限 tryAcquireGlobal 成功', () => {
    expect(tryAcquireGlobal()).toBe(true);
  });

  it('达到上限（4）后 tryAcquireGlobal 失败', () => {
    expect(tryAcquireGlobal()).toBe(true);
    expect(tryAcquireGlobal()).toBe(true);
    expect(tryAcquireGlobal()).toBe(true);
    expect(tryAcquireGlobal()).toBe(true);
    expect(tryAcquireGlobal()).toBe(false);
  });

  it('releaseGlobal 后可再次获取', () => {
    tryAcquireGlobal();
    tryAcquireGlobal();
    tryAcquireGlobal();
    tryAcquireGlobal();
    releaseGlobal();
    expect(tryAcquireGlobal()).toBe(true);
  });
});
