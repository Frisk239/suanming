// src/app/(app)/hepan/page.tsx
// 双人合盘 · 未上线占位页（spec M5 可扩展架构）。
// 实现时把 ComingSoon 换成真实合盘，modules.ts 改 status='live' 即可。
import { ComingSoon } from '@/components/shell/ComingSoon';

export default function HepanPage() {
  return <ComingSoon moduleId="hepan" />;
}
