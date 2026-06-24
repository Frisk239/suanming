// src/components/shell/TopNav.tsx
// 桌面顶部导航（spec M5 可扩展导航壳）。
//
// 结构（03-nav-and-cards.html 实测）：
//   左：品牌「青囊」glow-breathe 金光呼吸 + 英文副名
//   中：模块链（modules.ts 驱动，ModuleLink 渲染，active 墨痕下划线）
//   右：认证区（AuthButton）
//
// 响应式：sm: 以上显示（桌面），移动端用 BottomNav 替代。
// 毛玻璃：backdrop-blur + 半透明黛青深底。
//
// 可扩展性：模块链完全由 modules.ts 驱动，新增模块零改此组件。

'use client';

import Link from 'next/link';
import { MODULES } from '@/config/modules';
import { ModuleLink } from './ModuleLink';
import { AuthButton } from '@/components/shell/AuthButton';

export function TopNav() {
  return (
    <header className="sticky top-0 z-50 hidden sm:flex items-center justify-between px-6 h-14 border-b border-dai-qing/[0.05] bg-xuan-zhi-warm/85 backdrop-blur-xl">
      {/* 品牌：青囊 glow-breathe 金光呼吸（drop-shadow 8px↔24px 循环） */}
      <Link href="/" className="flex items-baseline gap-2">
        <span className="qn-glow-breathe font-serif text-2xl font-bold text-hu-po-jin">
          青囊
        </span>
        <span className="text-[13px] text-dai-qing/60 tracking-wide">
          Aether Pouch
        </span>
      </Link>

      {/* 模块链（modules.ts 驱动） */}
      <nav className="flex items-center gap-5">
        {MODULES.map((m) => (
          <ModuleLink key={m.id} module={m} />
        ))}
      </nav>

      {/* 认证区 */}
      <AuthButton />
    </header>
  );
}
