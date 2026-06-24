// src/components/home/GlyphField.tsx
// 悬浮星宿字装饰（02-glyphs.html / 10-home.html glyph-field 复刻）。
//
// 网格化散布星宿字，保证间隔不重叠：
//   - 单字逐个拆开（28 宿 + 天干地支 + 八卦），78% 概率横向 horizontal-tb
//   - 双字星名（紫微/天府…）22% 概率纵向 vertical-rl 竖排
//   - 按背景明度分区：浅底用黛青字(--ink)，深底用琥珀金字(--gold)
// 绝对定位铺满父级，pointer-events:none 不挡点击。

'use client';

import { useEffect, useRef } from 'react';

const SINGLE =
  '角亢氐房心尾箕斗牛女虚危室壁奎娄胃昴毕觜参井鬼柳星张翼轸甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥乾坤震巽坎离艮兑'.split(
    '',
  );
const DOUBLE = ['紫微', '天府', '天机', '太阴', '贪狼', '巨门', '廉贞', '武曲', '破军'];

type Variant = 'ink' | 'gold';

/**
 * 网格化散布浮字。
 * @param variant ink=黛青字（浅底区）/ gold=琥珀金字（深底区）
 * @param cols    网格列数
 * @param rows    网格行数
 * @param density 取多少比例的格子放字（0-1）
 */
export function GlyphField({
  variant = 'ink',
  cols = 6,
  rows = 4,
  density = 0.62,
}: {
  variant?: Variant;
  cols?: number;
  rows?: number;
  density?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    container.innerHTML = '';

    const cellW = 100 / cols;
    const cellH = 100 / rows;
    const cells: { c: number; r: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) cells.push({ c, r });
    }
    // 打乱后取前 density 比例的格子
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    const pickCount = Math.floor(cells.length * density);

    for (let i = 0; i < pickCount; i++) {
      const { c, r } = cells[i];
      const span = document.createElement('span');
      const useDouble = Math.random() < 0.22;
      span.className = `qn-glyph qn-glyph--${variant}${useDouble ? ' qn-glyph--vert' : ''}`;
      span.textContent = useDouble
        ? DOUBLE[Math.floor(Math.random() * DOUBLE.length)]
        : SINGLE[Math.floor(Math.random() * SINGLE.length)];
      const size = useDouble ? 20 + Math.random() * 6 : 17 + Math.random() * 11;
      span.style.fontSize = size.toFixed(1) + 'px';
      // 字在各自格子内随机微调，互不重叠
      span.style.left = (c * cellW + cellW * (0.2 + Math.random() * 0.5)).toFixed(2) + '%';
      span.style.top = (r * cellH + cellH * (0.2 + Math.random() * 0.5)).toFixed(2) + '%';
      span.style.animationDuration = (8 + Math.random() * 4).toFixed(2) + 's';
      span.style.animationDelay = (-Math.random() * 12).toFixed(2) + 's';
      container.appendChild(span);
    }
  }, [variant, cols, rows, density]);

  return (
    <div
      ref={ref}
      className="absolute inset-0 pointer-events-none overflow-hidden z-[1]"
      aria-hidden
    />
  );
}
