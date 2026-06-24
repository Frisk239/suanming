// src/components/shell/BottomNav.tsx
// 移动端底部导航（青囊 qingnang.cc 移动端 1:1 复刻，2026-06-24 chrome-devtools 抓取）。
//
// 5 格布局：首页 / 八字 / 紫微 / 更多 / 我的。
//   - 前 3 格：核心模块直链（首页 + 八字 + 紫微）
//   - 更多：点开全屏覆盖层，网格列出其余模块（六爻/合盘 等）
//   - 我的：账户入口
// active = 黛青实色 text-dai-qing，非活跃 = text-dai-qing/70。
// 图标 22px + 文字 10px，纵向 flex-col。
//
// 可扩展性：底栏核心模块 + 「更多」展开剩余，新增模块自动进「更多」网格。
// md:hidden：平板及以下显示（对齐青囊），桌面隐藏用 TopNav。

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MODULES } from '@/config/modules';
import { HomeIcon, MoreIcon, UserIcon, NAV_ICONS } from './NavIcon';

export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  // 核心直链模块（底栏前 3 格里的 2 个模块：八字/紫微）
  const coreMods = MODULES.filter((m) => m.pinnedBottom);
  // 更多里：未 pinned 的模块（六爻/合盘）
  const moreMods = MODULES.filter((m) => !m.pinnedBottom);

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-dai-qing/10 bg-xuan-zhi/95 backdrop-blur-md">
        <div className="flex items-center justify-around px-1 py-1.5">
          {/* 首页 */}
          <Link
            href="/"
            className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-0.5 py-1 transition-colors ${
              pathname === '/' ? 'text-dai-qing' : 'text-dai-qing/70'
            }`}
          >
            <HomeIcon />
            <span className="leading-tight text-[10px]">首页</span>
          </Link>

          {/* 核心模块（pinnedBottom，图标由 modules.ts bottomIcon 字段驱动） */}
          {coreMods.map((m) => {
            const Icon = NAV_ICONS[m.bottomIcon ?? 'more'];
            return (
              <Link
                key={m.id}
                href={`/${m.id}`}
                className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-0.5 py-1 transition-colors ${
                  isActive(`/${m.id}`) ? 'text-dai-qing' : 'text-dai-qing/70'
                }`}
              >
                <Icon />
                <span className="leading-tight text-[10px]">{m.label}</span>
              </Link>
            );
          })}

          {/* 更多（按钮，开覆盖层） */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-0.5 py-1 transition-colors ${
              moreOpen ? 'text-dai-qing' : 'text-dai-qing/70'
            }`}
          >
            <MoreIcon />
            <span className="leading-tight text-[10px]">更多</span>
          </button>

          {/* 我的 */}
          <Link
            href="/account"
            className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-0.5 py-1 transition-colors ${
              isActive('/account') ? 'text-dai-qing' : 'text-dai-qing/70'
            }`}
          >
            <UserIcon />
            <span className="leading-tight text-[10px]">我的</span>
          </Link>
        </div>
      </nav>

      {/* 「更多」全屏覆盖层：网格列出剩余模块（青囊实测：fixed inset-0 z-60） */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-60 flex flex-col">
          {/* 遮罩：点空白关闭 */}
          <button
            type="button"
            aria-label="关闭"
            className="absolute inset-0 bg-dai-qing-dark/40 backdrop-blur-sm cursor-default"
            onClick={() => setMoreOpen(false)}
          />
          {/* 面板：从底部上滑（rounded-t-3xl + shadow） */}
          <div className="relative mt-auto bg-xuan-zhi-warm rounded-t-3xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-serif text-lg tracking-[0.2em] text-dai-qing">更多术数</h2>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-dai-qing/60 hover:text-dai-qing hover:bg-dai-qing/10 transition-colors"
                aria-label="关闭"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {moreMods.map((m) => (
                <Link
                  key={m.id}
                  href={`/${m.id}`}
                  onClick={() => setMoreOpen(false)}
                  className="flex flex-col items-center gap-2 rounded-2xl px-2 py-4 bg-xuan-zhi border border-dai-qing/10 transition-colors hover:border-hu-po-jin/40 active:bg-dai-qing/5"
                >
                  <span className="font-serif text-3xl text-hu-po-jin leading-none">
                    {m.icon ?? m.label.charAt(0)}
                  </span>
                  <span className="font-serif text-sm text-dai-qing">{m.label}</span>
                  <span className="text-[10px] text-dai-qing/50 text-center leading-tight">
                    {m.tagline}
                  </span>
                </Link>
              ))}
            </div>
            <p className="mt-5 text-center text-[11px] text-dai-qing/40 tracking-wide">
              更多模块持续打磨中 · 敬请期待
            </p>
          </div>
        </div>
      )}
    </>
  );
}
