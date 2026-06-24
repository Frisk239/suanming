// src/components/shell/ModuleLink.tsx
// 单个模块导航链接（spec M5 可扩展导航）。
//
// 读 modules.ts 配置渲染。active 态加 qn-nav-ink 墨痕下划线（03-nav-and-cards.html
// 实测：底部 2px 圆角琥珀金渐变）。未上线模块标「开发中」灰标，但仍可点击进占位页。
//
// 可扩展性：新增模块只要在 modules.ts 加一项，此处无需改动即可渲染。

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ModuleConfig } from '@/types/ui';

export function ModuleLink({
  module,
  onClick,
}: {
  module: ModuleConfig;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const href = `/${module.id}`;
  // active：当前路径以模块 href 开头（/bazi、/bazi?... 都算）
  const active = pathname === href || pathname.startsWith(href + '/');
  const soon = module.status === 'soon';

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group relative px-1 py-1.5 text-sm tracking-wide transition-colors ${
        active ? 'text-dai-qing' : 'text-dai-qing/65 hover:text-dai-qing-light'
      }`}
    >
      {module.label}
      {soon && (
        <span className="ml-1.5 align-middle text-[10px] text-hu-po-jin/60">
          开发中
        </span>
      )}
      {/* active 墨痕下划线（qn-nav-ink：琥珀金渐变 2px 圆角，03-nav-and-cards.html 实测） */}
      {active && (
        <span className="qn-nav-ink absolute left-0 right-0 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-transparent via-hu-po-jin to-transparent" />
      )}
    </Link>
  );
}
