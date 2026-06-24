// src/app/(app)/liuyao/page.tsx
// 六爻起卦 · 未上线占位页（spec M5 可扩展架构）。
// 实现时把 ComingSoon 换成真实六爻排盘，modules.ts 改 status='live' 即可。
import { ComingSoon } from '@/components/shell/ComingSoon';

export default function LiuyaoPage() {
  return <ComingSoon moduleId="liuyao" />;
}
