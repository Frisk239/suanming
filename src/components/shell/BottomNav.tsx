// src/components/shell/BottomNav.tsx
// 移动端底部固定导航（spec M5 可扩展导航壳）。
//
// 取 pinnedBottom 模块 + 首页 + 我的入口。桌面端隐藏（sm:flex 才显示），与 TopNav 互补。
// active 态用琥珀金高亮。
//
// 可扩展性：pinnedBottom 模块由 modules.ts 驱动，新增核心模块标记 pinnedBottom 即自动入底栏。

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MODULES } from '@/config/modules';

export function BottomNav() {
  const pathname = usePathname();
  const pinned = MODULES.filter((m) => m.pinnedBottom);

  const items = [
    { id: 'home', label: '首页', href: '/' },
    ...pinned.map((m) => ({ id: m.id, label: m.label, href: `/${m.id}` })),
    { id: 'account', label: '我的', href: '/account' },
  ];

  return (
    <nav className="sm:hidden fixed bottom-0 inset-x-0 z-50 flex items-stretch h-14 border-t border-xuan-zhi/[0.06] bg-dai-qing-dark/95 backdrop-blur-xl">
      {items.map((it) => {
        const active = pathname === it.href;
        return (
          <Link
            key={it.id}
            href={it.href}
            className={`flex-1 flex flex-col items-center justify-center text-xs transition-colors ${
              active ? 'text-hu-po-jin' : 'text-xuan-zhi/50'
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
