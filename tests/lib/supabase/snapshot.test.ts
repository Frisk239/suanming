// tests/lib/supabase/snapshot.test.ts
// 快照读写辅助测试（M7 Phase 1）。
// isSnapshotValid 是纯函数，离线可测；findOrCreateProfile/save* 涉及 Supabase，
// 端到端验收时验证。

import { describe, it, expect } from 'vitest';
import { isSnapshotValid } from '@/lib/supabase/snapshot';
import { ENGINE_VERSION } from '@/lib/bazi-engine';

describe('isSnapshotValid', () => {
  it('有效：有 chart_snapshot 且版本匹配', () => {
    expect(
      isSnapshotValid({
        id: '1',
        user_id: 'u1',
        chart_snapshot: { year: '甲子' },
        analysis_snapshot: null,
        engine_version: ENGINE_VERSION,
      }),
    ).toBe(true);
  });

  it('无效：无 chart_snapshot', () => {
    expect(
      isSnapshotValid({
        id: '1',
        user_id: 'u1',
        chart_snapshot: null,
        analysis_snapshot: null,
        engine_version: ENGINE_VERSION,
      }),
    ).toBe(false);
  });

  it('无效：版本不匹配（旧引擎 m6）', () => {
    expect(
      isSnapshotValid({
        id: '1',
        user_id: 'u1',
        chart_snapshot: { year: '甲子' },
        analysis_snapshot: null,
        engine_version: 'm6',
      }),
    ).toBe(false);
  });

  it('无效：null', () => {
    expect(isSnapshotValid(null)).toBe(false);
  });
});
