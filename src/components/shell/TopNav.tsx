// src/components/shell/TopNav.tsx
// 顶部导航（spec M5 可扩展导航壳）。
//
// 响应式：
//   - 桌面 sm+：横排 品牌 + 模块链 + 认证区（与原 03-nav-and-cards 一致）
//   - 移动 <sm：只显示品牌（左）+ 汉堡按钮（右）；点汉堡开抽屉，
//     抽屉内纵向列模块链 + 登录。点链接或遮罩关闭。
//
// 品牌名 glow-breathe 金光呼吸；模块链由 modules.ts 驱动，active 墨痕下划线。
// 可扩展性：新增模块只改 modules.ts，此处自动渲染（含抽屉）。

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MODULES } from '@/config/modules';
import { ModuleLink } from './ModuleLink';
import { AuthButton } from '@/components/shell/AuthButton';

export function TopNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 h-14 border-b border-dai-qing/[0.05] bg-xuan-zhi-warm/85 backdrop-blur-xl">
        {/* 品牌：青囊 glow-breathe 金光呼吸 */}
        <Link href="/" className="flex items-baseline gap-2 shrink-0">
          <span className="qn-glow-breathe font-serif text-2xl font-bold text-hu-po-jin">
            青囊
          </span>
          <span className="hidden xs:inline text-[13px] text-dai-qing/60 tracking-wide">
            Aether Pouch
          </span>
        </Link>

        {/* 模块链（桌面 sm+，横排） */}
        <nav className="hidden sm:flex items-center gap-5">
          {MODULES.map((m) => (
            <ModuleLink key={m.id} module={m} />
          ))}
        </nav>

        {/* 认证区（桌面 sm+） */}
        <div className="hidden sm:block shrink-0">
          <AuthButton />
        </div>

        {/* 汉堡按钮（移动 <sm） */}
        <button
          type="button"
          aria-label="菜单"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="sm:hidden flex flex-col justify-center items-center w-9 h-9 gap-[5px] shrink-0"
        >
          <span
            className={`block w-5 h-0.5 bg-dai-qing transition-all duration-300 ${
              open ? 'translate-y-[7px] rotate-45' : ''
            }`}
          />
          <span
            className={`block w-5 h-0.5 bg-dai-qing transition-all duration-300 ${
              open ? 'opacity-0' : ''
            }`}
          />
          <span
            className={`block w-5 h-0.5 bg-dai-qing transition-all duration-300 ${
              open ? '-translate-y-[7px] -rotate-45' : ''
            }`}
          />
        </button>
      </header>

      {/* 移动端抽屉（<sm 才显示） */}
      {open && (
        <div className="sm:hidden fixed inset-0 z-40">
          {/* 遮罩：点空白关闭 */}
          <div
            className="absolute inset-0 bg-dai-qing-dark/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          {/* 抽屉面板：从右侧滑入 */}
          <div className="absolute top-14 right-0 bottom-0 w-72 max-w-[80vw] bg-xuan-zhi-warm shadow-2xl flex flex-col">
            <nav className="flex flex-col py-4">
              {MODULES.map((m) => (
                <div key={m.id} className="px-6">
                  <ModuleLink module={m} onClick={() => setOpen(false)} />
                </div>
              ))}
            </nav>
            <div className="mt-auto px-6 py-6 border-t border-dai-qing/10">
              <AuthButton />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
