// src/components/bazi/WuxingBadge.tsx
// 五行徽章（spec 5.4「天干地支/十神/五行用统一徽章」）。
// 给五行单字上色：金银灰 / 木青绿 / 水蓝 / 火赤 / 土黄褐（对齐 mingyu styles.css:997）。
// 复合五行（如柱的 wuXing="金火"）取首字判色。

import type { WuXing } from '@/types/bazi';

const WX_TEXT: Record<WuXing, string> = {
  '金': 'text-wx-jin',
  '木': 'text-wx-mu',
  '水': 'text-wx-shui',
  '火': 'text-wx-huo',
  '土': 'text-wx-tu',
};

interface Props {
  /** 五行字（单字如"金"，或复合如"金火"取首字判色） */
  wx: string;
  /** 显示内容，默认显示 wx 本身 */
  children?: React.ReactNode;
}

export function WuxingBadge({ wx, children }: Props) {
  const first = (wx[0] ?? '') as WuXing;
  const colorCls = WX_TEXT[first] ?? 'text-dai-qing/60';
  return <span className={`font-semibold ${colorCls}`}>{children ?? wx}</span>;
}
