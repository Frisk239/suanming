// src/config/modules.ts
// 模块注册表（spec M5 可扩展架构）。所有 Tab 在此声明，
// TopNav/BottomNav/占位页均从此读取。新增模块 = 加一项。
//
// 模块列表对齐青囊 + 用户 M5 决策：精简核心，只做八字(live)，
// 紫微/六爻/合盘为未上线占位。不完整复刻青囊 11 模块。

import type { ModuleConfig } from '@/types/ui';

export const MODULES: ModuleConfig[] = [
  {
    id: 'bazi',
    label: '八字',
    tagline: '四柱推命 · 格局用神 · AI 详批',
    status: 'live',
    order: 10,
    pinnedBottom: true,
    icon: '命',
    bottomIcon: 'bazi',
  },
  {
    id: 'ziwei',
    label: '紫微',
    tagline: '紫微斗数 · 十二宫参详',
    status: 'soon',
    order: 20,
    pinnedBottom: true,
    icon: '紫',
    bottomIcon: 'ziwei',
  },
  {
    id: 'liuyao',
    label: '六爻',
    tagline: '六爻起卦 · 爻象吉凶',
    status: 'soon',
    order: 30,
    icon: '卦',
  },
  {
    id: 'hepan',
    label: '合盘',
    tagline: '双人合盘 · 缘分对照',
    status: 'soon',
    order: 40,
    icon: '缘',
  },
];

/** 按 id 取模块；不存在返回 undefined */
export function getModule(id: string): ModuleConfig | undefined {
  return MODULES.find((m) => m.id === id);
}

/** 仅已上线模块（导航可直达的 live 模块） */
export const LIVE_MODULES = MODULES.filter((m) => m.status === 'live');
