// src/components/shell/ComingSoon.tsx
// 未上线模块的统一占位页（spec M5 可扩展架构）。
//
// 读 modules.ts 配置渲染（tagline/label/icon），避免每个占位页重复写文案。
// 样式复用 11-bazi.html 的双层框卡片 + 庚帖风格，与全站华彩统一。
//
// 可扩展性：soon→live 切换时，把对应 (app)/xxx/page.tsx 换成真实实现即可，
// modules.ts 改 status='live'，导航自动去掉「开发中」标——URL/路由不变。

import Link from 'next/link';
import { getModule } from '@/config/modules';

export function ComingSoon({ moduleId }: { moduleId: string }) {
  const mod = getModule(moduleId);
  if (!mod) return null;

  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 py-16">
      {/* 双层框卡片（11-bazi.html 结构：外黛青边 + 内琥珀金细边 inset 7px） */}
      <div className="card-wrap relative w-full max-w-xl">
        <div className="relative w-full rounded-md border border-dai-qing/15 shadow-[0_24px_60px_-20px_rgba(0,51,51,0.28)] bg-xuan-zhi overflow-hidden">
          {/* 内层琥珀金细边 */}
          <span
            className="pointer-events-none absolute inset-[7px] z-20 rounded border border-hu-po-jin/25"
            aria-hidden
          />

          {/* 深色头部（黛青渐变 + 模块名流光） */}
          <div className="relative overflow-hidden bg-gradient-to-b from-dai-qing-dark to-dai-qing px-8 py-10 text-center">
            <div className="flex items-center justify-center gap-3 text-[10px] tracking-[0.4em] text-hu-po-jin/60">
              <span className="h-px w-8 bg-gradient-to-r from-transparent to-hu-po-jin/45" />
              <span>青 囊 · 待 启</span>
              <span className="h-px w-8 bg-gradient-to-l from-transparent to-hu-po-jin/45" />
            </div>
            <h1 className="mt-4 flex justify-center gap-0 font-serif font-bold text-[clamp(34px,5vw,46px)] qn-glow-breathe text-hu-po-jin">
              {mod.label.split('').map((ch, i) => (
                <span key={i}>{ch}</span>
              ))}
            </h1>
            <p className="mt-3 font-serif text-sm text-xuan-zhi/55 leading-relaxed">
              {mod.tagline}
            </p>
          </div>

          {/* 内容区（玄纸暖底） */}
          <div className="px-8 py-10 text-center bg-xuan-zhi-warm">
            {/* 单字圆标（modules.ts 的 icon） */}
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-hu-po-jin/40">
              <span className="font-serif text-4xl text-hu-po-jin">
                {mod.icon ?? mod.label.charAt(0)}
              </span>
            </div>

            <span className="inline-block rounded-full border border-hu-po-jin/30 px-4 py-1 text-xs tracking-widest text-hu-po-jin">
              开发中 · 敬请期待
            </span>

            <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-dai-qing/60">
              本模块正以古籍为根基打磨中。当前可先体验已上线的八字推演——
              排盘 · 格局用神 · AI 详批，逐句引经据典。
            </p>

            <Link
              href="/bazi"
              className="qn-sheen-sweep relative mt-8 inline-block overflow-hidden rounded-md bg-hu-po-jin px-8 py-3 font-serif text-sm tracking-[0.3em] text-dai-qing-dark shadow-[0_10px_30px_rgba(212,175,55,0.3)] transition-colors hover:bg-hu-po-jin-light"
            >
              前往八字 →
            </Link>
          </div>
        </div>

        {/* 朱砂印章风装饰（11-bazi.html 的 seal） */}
        <div className="absolute -top-4 right-7 z-50 flex rotate-[-4deg] flex-col gap-[3px] rounded bg-[var(--seal-red)] px-[7px] py-2 font-serif text-[13px] font-semibold leading-none text-[#f7f2e7] shadow-[inset_0_0_0_1.5px_rgba(247,242,231,0.5),inset_0_0_10px_rgba(63,12,8,0.3),0_2px_10px_rgba(168,57,46,0.22)]">
          <span>待</span>
          <span>启</span>
        </div>
      </div>
    </main>
  );
}
