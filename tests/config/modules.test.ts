// tests/config/modules.test.ts
// 模块注册表单测（spec M5 可扩展导航）。

import { describe, it, expect } from 'vitest';
import { MODULES, getModule, LIVE_MODULES } from '@/config/modules';

describe('modules 注册表', () => {
  it('八字模块存在且为 live', () => {
    const bazi = getModule('bazi');
    expect(bazi).toBeDefined();
    expect(bazi!.status).toBe('live');
    expect(bazi!.label).toBe('八字');
  });

  it('紫微/六爻/合盘为 soon（未上线占位）', () => {
    expect(getModule('ziwei')?.status).toBe('soon');
    expect(getModule('liuyao')?.status).toBe('soon');
    expect(getModule('hepan')?.status).toBe('soon');
  });

  it('LIVE_MODULES 只含 status=live 的模块', () => {
    expect(LIVE_MODULES.every((m) => m.status === 'live')).toBe(true);
    expect(LIVE_MODULES.map((m) => m.id)).toContain('bazi');
    expect(LIVE_MODULES.map((m) => m.id)).not.toContain('ziwei');
  });

  it('按 order 升序排列', () => {
    const orders = MODULES.map((m) => m.order);
    const sorted = [...orders].sort((a, b) => a - b);
    expect(orders).toEqual(sorted);
  });

  it('id 唯一', () => {
    const ids = MODULES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('至少一个模块 pinnedBottom（移动底栏）', () => {
    expect(MODULES.some((m) => m.pinnedBottom)).toBe(true);
  });

  it('每个模块都有单字图标 icon', () => {
    for (const m of MODULES) {
      expect(m.icon, `${m.id} 缺 icon`).toBeTruthy();
      expect(m.icon!.length).toBeGreaterThanOrEqual(1);
    }
  });
});
