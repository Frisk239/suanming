// src/components/shell/NavIcon.tsx
// 底部导航图标（青囊 qingnang.cc 实测 SVG 1:1 复刻，2026-06-24 抓取）。
// 全部 viewBox 0 0 24 24，stroke=currentColor，fill=none。
// 通过 text-dai-qing / text-dai-qing/70 控制颜色（currentColor 继承）。

interface IconProps {
  size?: number;
  className?: string;
}

/** 首页：房子（M3 9.5L12 3...） */
export function HomeIcon({ size = 22, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

/** 八字：罗盘（圆 + 十字 + 对角交叉，strokeWidth 2.2 稍粗） */
export function BaziIcon({ size = 22, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12h18" />
      <path d="M7.5 7.5l9 9M16.5 7.5l-9 9" />
    </svg>
  );
}

/** 紫微：五角星 */
export function ZiweiIcon({ size = 22, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 2l2.5 6.5L21 9l-5 4.5L17.5 21 12 17l-5.5 4L8 13.5 3 9l6.5-.5z" />
    </svg>
  );
}

/** 更多：3×3 圆点矩阵 */
export function MoreIcon({ size = 22, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      className={className}
      aria-hidden
    >
      <circle cx="5" cy="5" r="1.4" />
      <circle cx="12" cy="5" r="1.4" />
      <circle cx="19" cy="5" r="1.4" />
      <circle cx="5" cy="12" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="19" cy="12" r="1.4" />
      <circle cx="5" cy="19" r="1.4" />
      <circle cx="12" cy="19" r="1.4" />
      <circle cx="19" cy="19" r="1.4" />
    </svg>
  );
}

/** 我的：人头（圆头 + 肩膀弧线） */
export function UserIcon({ size = 22, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 0112 0v1" />
    </svg>
  );
}
