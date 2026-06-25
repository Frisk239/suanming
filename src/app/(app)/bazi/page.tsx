// src/app/(app)/bazi/page.tsx
// /bazi 主页面（spec 5.2/5.6/5.8）。合并录入+排盘+详批，状态机编排。
// 分享 URL：出生信息（匿名，不含 name）编码到 query，刷新可复现表单（spec 5.2）。
//
// 结构：page（壳，Suspense 边界）→ BaziPageContent（client，用 useSearchParams）。
// useSearchParams 在 Next 16 需 Suspense 包裹（否则 prerender 退化为全 CSR + build 警告）。
//
// 注：M5 迁入 route group (app)，URL /bazi 不变。Task 10d 会深度复刻 11-bazi.html 重做。

'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { BirthForm } from '@/components/bazi/BirthForm';
import { ChartBoard } from '@/components/bazi/ChartBoard';
import { AnalysisPanel } from '@/components/bazi/AnalysisPanel';
import { InterpretPanel } from '@/components/bazi/InterpretPanel';
import { GlyphField } from '@/components/home/GlyphField';
import { fetchAnalysis } from '@/lib/client/api';
import type { ChartInput } from '@/types/bazi';
import type { ChartState, BirthFormState } from '@/types/ui';

export default function BaziPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-xuan-zhi-warm" />}>
      <BaziPageContent />
    </Suspense>
  );
}

function BaziPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [chartState, setChartState] = useState<ChartState | null>(null);
  const [lastInput, setLastInput] = useState<ChartInput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 从 URL query 读初始表单值（分享链接复现，spec 5.2）。匿名，不含 name。
  const initialForm: Partial<BirthFormState> = {
    gender: (searchParams.get('g') as 'male' | 'female') ?? undefined,
    year: searchParams.get('y') ?? undefined,
    month: searchParams.get('m') ?? undefined,
    day: searchParams.get('d') ?? undefined,
    hour: searchParams.get('h') ?? undefined,
    minute: searchParams.get('mi') ?? undefined,
    city: searchParams.get('c') ?? undefined,
    useTrueSolar: searchParams.get('ts') === '0' ? false : undefined,
  };

  const handleSubmit = async (input: ChartInput) => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchAnalysis(input); // 一次拿 chart + analysis
      setChartState(result);
      setLastInput(input);
      // 写 URL（匿名，不含 name），便于分享复现（spec 5.2）
      const [date, time] = input.solarDate.split(' ');
      const [y, m, d] = date.split('-');
      const [h, mi] = time.split(':');
      const q = new URLSearchParams({
        g: input.gender,
        y,
        m: String(Number(m)),
        d,
        h,
        mi,
        c: input.city ?? '',
        ts: String(input.useTrueSolar ?? true),
      });
      router.replace(`/bazi?${q.toString()}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '排盘失败');
      setChartState(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    // 排盘页玄纸暖底（11-bazi.html 实测 #f5f5dc）+ 稀疏黛青浮字
    <main className="relative min-h-screen bg-xuan-zhi-warm overflow-hidden">
      <GlyphField variant="ink" cols={5} rows={8} density={0.4} />

      <div className="relative z-[2] py-8 px-4">
        <div className="space-y-4">
          {/* 录入（始终展示，便于改参数重排，spec 5.6） */}
          <BirthForm initial={initialForm} onSubmit={handleSubmit} loading={loading} />
          {error && (
            <p className="text-vermillion text-sm text-center bg-vermillion/5 rounded py-2">
              ⚠ {error}
            </p>
          )}

          {/* 排盘结果 */}
          {chartState && (
            <>
              <ChartBoard chart={chartState.chart} />
              <AnalysisPanel analysis={chartState.analysis} />
              {lastInput && (
                <InterpretPanel input={lastInput} profileId={chartState.profileId} />
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
