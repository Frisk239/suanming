// src/app/login/page.tsx
// 登录/注册页（12-login.html 深度复刻，spec M5 用户系统）。
//
// 结构 = 首页的壳（浅底→黛青渐变 + 波浪墨海 + 浮字）+ 中间 LoginCard。
// 独立路由（不在 (app) 组内）——登录页不显示导航壳的「登录」按钮，保持独立感。
// 顶部仅一个返回链接。

import Link from 'next/link';
import { LoginCard } from '@/components/auth/LoginCard';
import { InkSea } from '@/components/home/InkSea';
import { GlyphField } from '@/components/home/GlyphField';

export default function LoginPage() {
  return (
    <main
      className="relative min-h-screen flex flex-col items-center justify-center px-6 py-20 text-center overflow-hidden"
      style={{
        background:
          'linear-gradient(to bottom, #f5f5dc 0%, #f5f5dc 50%, #003333 100%)',
      }}
    >
      {/* 氛围光晕 */}
      <div className="absolute rounded-full pointer-events-none blur-[40px] left-[12%] top-[14%] w-72 h-72 bg-hu-po-jin/[0.05]" />
      <div className="absolute rounded-full pointer-events-none blur-[40px] bottom-[18%] right-[8%] w-64 h-64 bg-dai-qing-light/[0.12]" />

      {/* 波浪墨海 */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none z-[1]"
        style={{
          maskImage:
            'linear-gradient(to bottom, transparent 0%, #000 15%, #000 70%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0%, #000 15%, #000 70%, transparent 100%)',
        }}
      >
        <InkSea />
      </div>

      {/* 浮字（浅底区黛青字） */}
      <GlyphField variant="ink" cols={5} rows={8} density={0.4} />

      {/* 返回链接 */}
      <Link
        href="/"
        className="relative z-[2] self-start mb-8 text-sm text-dai-qing/50 hover:text-hu-po-jin-dark"
      >
        ← 返回
      </Link>

      {/* 登录卡片 */}
      <div className="relative z-[2]">
        <LoginCard />
      </div>

      {/* 底部声明（深底区，玄纸暗字） */}
      <p className="relative z-[2] mt-8 text-xs text-xuan-zhi/35 leading-relaxed max-w-sm">
        仅作文化研究与体验，不构成任何决策建议
      </p>
    </main>
  );
}
