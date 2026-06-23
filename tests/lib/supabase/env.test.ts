// tests/lib/supabase/env.test.ts
// 验证 Supabase 环境变量已加载（依赖 vitest.config.ts 的 dotenv 加载）。
import { describe, it, expect } from 'vitest';

describe('Supabase 环境变量', () => {
  it('应配置了 NEXT_PUBLIC_SUPABASE_URL', () => {
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeTruthy();
  });
  it('应配置了 NEXT_PUBLIC_SUPABASE_ANON_KEY', () => {
    expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeTruthy();
  });
  it('应配置了 SUPABASE_SERVICE_ROLE_KEY', () => {
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeTruthy();
  });
});
