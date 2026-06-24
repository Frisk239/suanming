// src/app/page.tsx
// 首页：华彩落地页（10-home.html 完整结构照搬，2026-06-24 用户验收版）。
//
// 5 个 section（青囊实测）：
//   S0 hero(88vh)   宣纸→黛青渐变 + 波浪横跨分界线（衔接两区）+ 青囊大字流光
//   S1 核心功能     黛青深底 + 功能卡片网格（modules.ts 驱动）+ 琥珀金浮字
//   S2 人格演示     宣纸卡片浮深底上 + 人格/深度切换 + 示例输出(lamp灯晕)
//   S3 PWA          黛青深底 + 随身携带
//
// 落在 (app) 组外（根路由），自带轻量顶栏，复用导航壳的视觉但独立渲染。

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MODULES } from '@/config/modules';
import { InkSea } from '@/components/home/InkSea';
import { GlyphField } from '@/components/home/GlyphField';

type Persona = 'scholar' | 'hermit';
type Depth = 'standard' | 'popular';

const PERSONAS: { id: Persona; sub: string; title: string; desc: string }[] = [
  {
    id: 'scholar',
    sub: 'SCHOLAR',
    title: '严谨学者',
    desc: '客观、专业、克制，如博导般引经据典、逻辑严密',
  },
  {
    id: 'hermit',
    sub: 'HERMIT',
    title: '幽默隐士',
    desc: '随性、风趣、一针见血，如酒后老友般生动比喻',
  },
];

// 人格演示示例文风（10-home.html 原文）
const DEMO_TEXT: Record<Persona, string> = {
  scholar:
    '依《滴天髓》「得时俱为旺论」，甲木生于寅月，得令而旺；月干透丙，食神吐秀——格成食神生财，气势顺遂，宜泄不宜克。',
  hermit:
    '您这八字啊，甲木生在寅月，正是春深木旺的时候，跟开了挂似的。月干丙火一透，食神往外吐秀气，这叫「顺势而为」——别硬来，顺着走就舒坦。',
};

export default function Home() {
  const [persona, setPersona] = useState<Persona>('scholar');
  const [depth, setDepth] = useState<Depth>('standard');

  return (
    <main className="flex flex-col">
      {/* ===== S0 HERO：宣纸→黛青渐变 + 波浪横跨分界 ===== */}
      <section
        className="relative min-h-[88vh] flex flex-col items-center justify-center px-6 py-16 text-center overflow-hidden"
        style={{
          background:
            'linear-gradient(to bottom, #fbfaf5 0%, #fbfaf5 44%, #003333 100%)',
        }}
      >
        {/* 氛围光晕圆斑 */}
        <div className="absolute rounded-full pointer-events-none blur-[40px] left-[12%] top-[18%] w-72 h-72 bg-hu-po-jin/[0.05]" />
        <div className="absolute rounded-full pointer-events-none blur-[40px] bottom-[22%] right-[8%] w-64 h-64 bg-dai-qing-light/[0.12]" />

        {/* 波浪墨海（横跨宣纸/黛青分界线） */}
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

        {/* hero 浅底区：黛青浮字 */}
        <GlyphField variant="ink" cols={6} rows={4} density={0.62} />

        {/* hero 内容 */}
        <div className="relative z-[2]">
          <h1 className="flex gap-[0.1em] leading-none font-serif font-bold text-[clamp(80px,14vw,160px)]">
            <span className="qn-glow-breathe text-hu-po-jin">青</span>
            <span className="qn-glow-breathe text-hu-po-jin">囊</span>
          </h1>
          <p className="mt-4 text-hu-po-jin/50 text-sm tracking-[0.35em]">AETHER POUCH</p>
          <p className="mt-3 font-serif text-xl text-xuan-zhi/85">古籍为根 · AI 参详</p>
          <p className="mt-2 text-sm text-xuan-zhi/55 leading-relaxed max-w-md mx-auto">
            《周易》《滴天髓》《三命通会》原文为根
            <br />
            AI 逐句参详，专业克制，按次计费，不订阅
          </p>
          <div className="mt-7 flex gap-4 flex-wrap justify-center">
            <Link
              href="/bazi"
              className="px-8 py-3 rounded-lg bg-hu-po-jin text-xuan-zhi font-serif tracking-[0.1em] transition-all hover:bg-hu-po-jin-dark hover:-translate-y-0.5"
            >
              开始排盘
            </Link>
            <Link
              href="/liuyao"
              className="px-8 py-3 rounded-lg border border-xuan-zhi/40 text-xuan-zhi/90 font-serif tracking-[0.1em] transition-all hover:border-hu-po-jin hover:text-hu-po-jin"
            >
              六爻起卦
            </Link>
          </div>
        </div>
      </section>

      {/* ===== S1 核心功能（黛青深底 + 卡片网格）===== */}
      <section className="relative bg-dai-qing-dark text-xuan-zhi px-6 py-20 pb-28 overflow-hidden">
        {/* 深底：琥珀金浮字 */}
        <GlyphField variant="gold" cols={7} rows={6} density={0.62} />

        <div className="relative z-[2] max-w-[1100px] mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl tracking-[0.15em] text-xuan-zhi">核心功能</h2>
            <div className="w-32 h-px mx-auto mt-4 bg-gradient-to-r from-transparent via-hu-po-jin/50 to-transparent" />
            <p className="mt-3 text-sm text-xuan-zhi/50">
              每一句解读都引自古籍原文，可溯源、不空谈、千人千面
            </p>
          </div>

          {/* 功能卡片网格（modules.ts 驱动，可扩展） */}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
            {MODULES.map((m) => (
              <Link
                key={m.id}
                href={`/${m.id}`}
                className="group relative flex flex-col rounded-2xl border border-xuan-zhi/[0.08] p-7 bg-gradient-to-br from-dai-qing to-dai-qing-dark transition-all hover:border-hu-po-jin/25 hover:-translate-y-1"
              >
                {m.status === 'live' && (
                  <span className="absolute right-4 top-4 rounded-full px-3 py-0.5 text-xs text-hu-po-jin bg-hu-po-jin/15">
                    免费
                  </span>
                )}
                <span className="self-start font-serif text-4xl text-hu-po-jin leading-none">
                  {m.icon ?? m.label.charAt(0)}
                </span>
                <h3 className="mt-4 font-serif text-xl text-xuan-zhi">{m.label}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-xuan-zhi/60">
                  {m.tagline}
                </p>
                <div className="mt-5 flex items-center gap-1.5 text-xs text-hu-po-jin/60 group-hover:text-hu-po-jin">
                  <span>{m.status === 'soon' ? '开发中' : '了解更多'}</span>
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== S2 人格演示（宣纸卡片浮深底 + 人格/深度切换 + 示例输出）===== */}
      <section className="relative px-6 py-28 bg-dai-qing-dark">
        <div className="max-w-[896px] mx-auto text-center">
          <p className="text-[11px] tracking-[0.4em] text-xuan-zhi/55">四 维 交 互</p>
          <h2 className="mt-4 font-serif text-3xl text-xuan-zhi">两种人格 × 两种深度</h2>
          <p className="mt-4 text-sm text-xuan-zhi/60">
            同一张盘，两种讲法——点下方按钮，现场感受
          </p>

          {/* 宣纸卡片浮在深色页面上 */}
          <div className="relative mt-12 bg-xuan-zhi rounded-2xl p-10 text-left shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
            <div className="grid grid-cols-2 gap-3">
              {PERSONAS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPersona(p.id)}
                  className={`flex flex-col gap-1 p-5 rounded-[10px] border-[1.5px] bg-xuan-zhi-dark text-left transition-all ${
                    persona === p.id
                      ? 'border-hu-po-jin bg-hu-po-jin/[0.06]'
                      : 'border-dai-qing/12 hover:border-hu-po-jin/40'
                  }`}
                >
                  <span className="text-[11px] tracking-[0.15em] text-hu-po-jin-dark">
                    {p.sub}
                  </span>
                  <span className="font-serif text-lg text-dai-qing">{p.title}</span>
                  <span className="text-xs leading-relaxed text-dai-qing/55">{p.desc}</span>
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {(['standard', 'popular'] as Depth[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDepth(d)}
                  className={`px-[18px] py-2 rounded-full border flex flex-col items-center transition-all ${
                    depth === d
                      ? 'border-hu-po-jin bg-hu-po-jin text-xuan-zhi'
                      : 'border-dai-qing/15 hover:border-hu-po-jin/40'
                  }`}
                >
                  <span className="text-[13px]">{d === 'standard' ? '专业级' : '通俗级'}</span>
                  <span className="text-[10px] opacity-70">
                    {d === 'standard' ? '完整推演' : '直给结论'}
                  </span>
                </button>
              ))}
            </div>

            {/* 示例输出框（黛青底 + lamp 灯晕） */}
            <div className="mt-6 rounded-xl overflow-hidden bg-gradient-to-br from-dai-qing to-dai-qing-dark">
              <div className="flex items-center gap-2 px-[18px] py-3 border-b border-xuan-zhi/[0.08] text-xuan-zhi/60 text-[13px]">
                <span className="w-2 h-2 rounded-full bg-hu-po-jin qn-lamp-pulse" />
                <span>参详输出 · {persona === 'scholar' ? '严谨学者' : '幽默隐士'}文风</span>
              </div>
              <p className="px-6 py-5 font-serif text-[15px] leading-loose text-xuan-zhi/85">
                {DEMO_TEXT[persona]}
              </p>
            </div>

            <p className="mt-3.5 text-center text-xs text-dai-qing/45">
              正式详批中可随时切换人格与深度 · 以上仅为文风示例
            </p>
            <div className="text-center mt-5">
              <Link
                href="/bazi"
                className="inline-block text-hu-po-jin-dark hover:text-hu-po-jin text-sm"
              >
                免费排一张自己的盘试试 →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== S3 PWA ===== */}
      <section className="bg-dai-qing-dark text-xuan-zhi px-6 py-20 text-center">
        <h2 className="font-serif text-3xl tracking-[0.1em]">随身携带你的青囊</h2>
        <p className="mt-3 text-sm text-xuan-zhi/50 leading-relaxed">
          添加到手机桌面，像原生 App 一样随时打开
          <br />
          无需下载，无需应用商店，一键直达
        </p>
      </section>

      <footer className="bg-dai-qing-dark text-xuan-zhi/50 px-6 py-8 text-center text-[13px]">
        <div>青囊 · Aether Pouch</div>
        <div className="mt-2 text-xs text-xuan-zhi/30">
          古籍数字化 · AI 参详 — 仅作文化研究与体验，不构成任何决策建议
        </div>
      </footer>
    </main>
  );
}
