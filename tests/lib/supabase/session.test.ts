// tests/lib/supabase/session.test.ts
// session 辅助单测（spec M5 用户系统）。
// mock 掉 createServerClient，只验 getSession/requireUser 的逻辑分支。

import { describe, it, expect, vi, beforeEach } from 'vitest';

// mock server.ts 的 createServerClient 返回值（避免真实连 Supabase）
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}));

import { createServerClient } from '@/lib/supabase/server';
import { getSession, requireUser, AuthError } from '@/lib/supabase/session';

// 简化 getUser 的 mock 返回构造器
function mockClient(user: { id: string; email: string } | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
  };
}

describe('session 辅助', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getSession 有用户时返回 { id, email }', async () => {
    (createServerClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockClient({ id: 'u1', email: 'a@b.com' }),
    );
    expect(await getSession()).toEqual({ id: 'u1', email: 'a@b.com' });
  });

  it('getSession 无用户时返回 null', async () => {
    (createServerClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockClient(null),
    );
    expect(await getSession()).toBeNull();
  });

  it('getSession 底层抛错时返回 null（不抛）', async () => {
    (createServerClient as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('network down'),
    );
    expect(await getSession()).toBeNull();
  });

  it('requireUser 有用户时返回 user', async () => {
    (createServerClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockClient({ id: 'u1', email: 'a@b.com' }),
    );
    expect(await requireUser()).toEqual({ id: 'u1', email: 'a@b.com' });
  });

  it('requireUser 无用户时抛 AuthError', async () => {
    (createServerClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockClient(null),
    );
    await expect(requireUser()).rejects.toThrow(AuthError);
  });
});
