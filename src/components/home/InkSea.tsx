// src/components/home/InkSea.tsx
// 波浪墨海组件（华彩皮肤最华丽元素，01-ink-sea.html / 10-home.html 像素级复刻）。
//
// 实现真相：两张 webp 海纹图 + CSS 动画（非 Canvas/SVG）。
//   - 远层 sea-strip：layer top 24% · 起伏 12s bob 10px · 横滚 120s
//   - 近层 sea-front：layer top 56% · 起伏 9s（延迟-4s）bob 7px · 横滚 48s
//   - 每张图复制 ×2 无缝平铺；外层 mask 渐变让波浪在宣纸/黛青分界处若隐若现
//   - 底色 floor 从 44% 高度铺到底部（黛青深）
//
// 横跨宣纸/黛青分界线是核心衔接动画（10-home.html hero 实测）。
// 绝对定位铺满父级，父级需 position:relative + overflow:hidden。

'use client';

export function InkSea() {
  return (
    <div className="ink-sea absolute inset-0 overflow-hidden pointer-events-none z-[1]">
      {/* 海面之下纯色底（从 44% 铺到底） */}
      <div className="ink-sea__floor absolute left-0 right-0 bottom-0 top-[44%] bg-dai-qing-dark" />

      {/* 远层：sea-strip 细条 */}
      <div
        className="ink-sea__layer ink-sea__layer--strip"
        style={{ top: '24%', animationDuration: '12s', ['--bob-amp' as string]: '10px' }}
      >
        <div className="ink-sea__track" style={{ animationDuration: '120s' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/home/sea-strip.webp" alt="" aria-hidden />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/home/sea-strip.webp" alt="" aria-hidden />
        </div>
      </div>

      {/* 近层：sea-front 前景 */}
      <div
        className="ink-sea__layer ink-sea__layer--front"
        style={{ top: '56%', animationDuration: '9s', animationDelay: '-4s', ['--bob-amp' as string]: '7px' }}
      >
        <div className="ink-sea__track" style={{ animationDuration: '48s' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/home/sea-front.webp" alt="" aria-hidden />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/home/sea-front.webp" alt="" aria-hidden />
        </div>
      </div>
    </div>
  );
}
