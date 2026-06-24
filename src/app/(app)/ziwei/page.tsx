// src/app/(app)/ziwei/page.tsx
// 紫微斗数 · 未上线占位页（spec M5 可扩展架构）。
// 实现时把 ComingSoon 换成真实紫微排盘，modules.ts 改 status='live' 即可。
import { ComingSoon } from '@/components/shell/ComingSoon';

export default function ZiweiPage() {
  return <ComingSoon moduleId="ziwei" />;
}
