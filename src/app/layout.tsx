import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { getSession } from "@/lib/supabase/session";

/*
 * 衬线字体：标题/排盘用，显古意（spec 5.4）。
 *
 * 不用 next/font/google 的 Noto Serif SC —— 该字体体积大（中文字符全量），
 * Turbopack 从 Google Fonts CDN 首次拉取在本机网络下不稳定，会触发
 * "@vercel/turbopack-next/internal/font/google/font 模块解析失败"。
 *
 * 改用系统衬线字体栈（globals.css 的 --font-serif + .font-serif-display 已定义）：
 * Songti SC（macOS）/ SimSun（Windows）/ Source Han Serif SC（Linux），
 * 各平台都有衬线宋体，满足 spec 5.4 "标题衬线显古意"。
 * 后续若需统一字形，可改用 next/font/local 加载本地 woff2（不依赖 CDN）。
 */

export const metadata: Metadata = {
  title: "青囊复刻 · 古籍数字化 AI 推演",
  description: "八字排盘 · 格局用神 · AI 详批｜古籍为根，AI 参详",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 服务端取 session 下发给客户端 Context（TopNav/AuthButton 读用）。
  // getSession 内部已 catch，不会因网络/未登录抛出。
  const user = await getSession();

  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <SessionProvider user={user}>{children}</SessionProvider>
      </body>
    </html>
  );
}
