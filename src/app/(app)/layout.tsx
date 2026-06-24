// src/app/(app)/layout.tsx
// 应用主壳（spec M5 可扩展导航）：TopNav（桌面）+ 内容区 + BottomNav（移动）。
//
// route group (app) 不计入 URL：所有模块页（/bazi /ziwei /liuyao /hepan /account）
// 落在此组内，共享导航壳。新增模块只需在 (app) 下建目录 + modules.ts 加一项。
//
// 注意：内容区用 <div> 不用 <main>，因各子页面自带 <main>（避免 main 嵌套，
// HTML 规范每页一个 main）。pb-16 给移动底栏留出空间。

import { TopNav } from '@/components/shell/TopNav';
import { BottomNav } from '@/components/shell/BottomNav';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TopNav />
      {/* 移动底栏留空间：3.5rem + iPhone 安全区；桌面 md+ 无底栏 */}
      <div className="flex-1 pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        {children}
      </div>
      <BottomNav />
    </>
  );
}
