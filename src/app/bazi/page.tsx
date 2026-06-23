// src/app/bazi/page.tsx
// /bazi 主页面（spec 5.2/5.6）。合并录入+排盘+详批，状态机编排：
//   input → loading → result（含 interpreting 子态）
// 点「开启推演」→ fetchAnalysis 一次拿 chart+analysis → 渲染排盘 → 详批面板出现。

'use client';

import { useState } from 'react';
import { BirthForm } from '@/components/bazi/BirthForm';
import { ChartBoard } from '@/components/bazi/ChartBoard';
import { AnalysisPanel } from '@/components/bazi/AnalysisPanel';
import { InterpretPanel } from '@/components/bazi/InterpretPanel';
import { fetchAnalysis } from '@/lib/client/api';
import type { ChartInput } from '@/types/bazi';
import type { ChartState } from '@/types/ui';

export default function BaziPage() {
  const [chartState, setChartState] = useState<ChartState | null>(null);
  const [lastInput, setLastInput] = useState<ChartInput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (input: ChartInput) => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchAnalysis(input); // 一次拿 chart + analysis
      setChartState(result);
      setLastInput(input);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '排盘失败');
      setChartState(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-ink-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* 录入（始终展示，便于改参数重排，spec 5.6） */}
        <BirthForm onSubmit={handleSubmit} loading={loading} />
        {error && (
          <p className="text-wx-huo text-sm text-center bg-wx-huo/5 rounded py-2">
            ⚠ {error}
          </p>
        )}

        {/* 排盘结果 */}
        {chartState && (
          <>
            <ChartBoard chart={chartState.chart} />
            <AnalysisPanel analysis={chartState.analysis} />
            {lastInput && <InterpretPanel input={lastInput} />}
          </>
        )}
      </div>
    </main>
  );
}
