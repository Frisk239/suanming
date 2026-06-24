// src/components/bazi/AnalysisPanel.tsx
// ②层解读展示（spec 5.5「日主气数」「命局解读」）。strength + pattern + yongshen
// 三块卡片，再组合 DayunList。

import type { BaziAnalysisResult } from '@/lib/bazi-engine';
import { WuxingBadge } from './WuxingBadge';
import { DayunList } from './DayunList';

interface Props {
  analysis: BaziAnalysisResult;
}

export function AnalysisPanel({ analysis }: Props) {
  const { strength, pattern, yongshen } = analysis;
  const { deLing, deDi, deShi } = strength.breakdown;

  return (
    <div className="space-y-4">
      {/* 日主气数（滴天髓三得：得令/得地/得势，spec 5.5） */}
      <div className="bg-xuan-zhi rounded-lg shadow-sm border border-dai-qing/15 p-6">
        <h3 className="font-serif-display text-lg text-dai-qing-dark mb-3 tracking-widest">
          日主气数
        </h3>
        <div className="flex items-baseline gap-6">
          <div>
            <span className="text-sm text-dai-qing/60">强弱</span>
            <span className="ml-2 font-serif-display text-xl text-dai-qing-dark">
              {strength.level}
            </span>
          </div>
          <div>
            <span className="text-sm text-dai-qing/60">综合分</span>
            <span className="ml-2 text-dai-qing font-semibold">{strength.score}</span>
          </div>
        </div>
        <div className="mt-3 flex gap-4 text-xs text-dai-qing/60">
          <span>
            得令 {strength.deLingBool ? '✓' : '✗'}{' '}
            <span className={strength.deLingBool ? 'text-accent' : 'text-wx-huo'}>
              {deLing}
            </span>
          </span>
          <span>
            得地 {strength.deDiBool ? '✓' : '✗'}{' '}
            <span className={strength.deDiBool ? 'text-accent' : 'text-wx-huo'}>
              {deDi}
            </span>
          </span>
          <span>
            得势 {strength.deShiBool ? '✓' : '✗'}{' '}
            <span className={strength.deShiBool ? 'text-accent' : 'text-wx-huo'}>
              {deShi}
            </span>
          </span>
        </div>
      </div>

      {/* 命局解读：格局 + 用神喜忌（spec 5.5） */}
      <div className="bg-xuan-zhi rounded-lg shadow-sm border border-dai-qing/15 p-6">
        <h3 className="font-serif-display text-lg text-dai-qing-dark mb-3 tracking-widest">
          命局解读
        </h3>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-dai-qing/60">格局：</span>
            <span className="font-serif-display text-dai-qing-dark">{pattern.name}</span>
            <span className="text-xs text-dai-qing/60 ml-2">{pattern.basis}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-dai-qing/60">用神：</span>
            <WuxingBadge wx={yongshen.primary} />
            <span className="text-dai-qing/60 ml-2">喜：</span>
            {yongshen.favor.map((w) => (
              <WuxingBadge key={w} wx={w}>
                {w}
              </WuxingBadge>
            ))}
            <span className="text-dai-qing/60 ml-2">忌：</span>
            {yongshen.avoid.map((w) => (
              <WuxingBadge key={w} wx={w}>
                {w}
              </WuxingBadge>
            ))}
          </div>
          {yongshen.advice && (
            <p className="text-xs text-dai-qing/40 pt-1">{yongshen.advice}</p>
          )}
        </div>
      </div>

      {/* 大运（组合 DayunList） */}
      <DayunList daYuns={analysis.daYuns} />
    </div>
  );
}
