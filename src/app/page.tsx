// src/app/page.tsx
// 首页：重定向到 /bazi（spec 5.2 页面结构，M4 暂不独立落地页）。
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/bazi');
}
