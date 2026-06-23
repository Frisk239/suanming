// src/app/page.tsx
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-3xl font-serif">青囊复刻 · 八字模块</h1>
      <p className="mt-4 text-gray-600">
        M1 完成：排盘 API 已就绪 → POST /api/bazi/chart
      </p>
    </main>
  );
}
