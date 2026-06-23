import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "青囊复刻 · 八字模块",
  description: "古籍数字化 AI 推演平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
