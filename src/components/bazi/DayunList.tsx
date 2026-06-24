// src/components/bazi/DayunList.tsx
// 大运列表（spec 5.5「大运 · 流年」）。每步大运一个卡片，带 tier 色标。
// tier 配色（spec 5.4）：good=青绿(accent, 善神) / neutral=灰(ink) / bad=赤(wx-huo, 忌神)。

import type { BaziAnalysisResult } from '@/lib/bazi-engine';

type Dayun = BaziAnalysisResult['daYuns'][number];

const TIER_STYLE: Record<Dayun['assessment']['tier'], string> = {
  good: 'bg-accent/10 text-accent border-accent/40',
  neutral: 'bg-dai-qing/10 text-dai-qing/70 border-dai-qing/30',
  bad: 'bg-wx-huo/10 text-wx-huo border-wx-huo/40',
};
const TIER_LABEL: Record<Dayun['assessment']['tier'], string> = {
  good: '吉',
  neutral: '平',
  bad: '凶',
};

interface Props {
  daYuns: BaziAnalysisResult['daYuns'];
}

export function DayunList({ daYuns }: Props) {
  return (
    <div className="bg-xuan-zhi rounded-lg shadow-sm border border-dai-qing/15 p-6">
      <h3 className="font-serif-display text-lg text-ink-900 mb-3 tracking-widest">
        大运 · 流年
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {daYuns.map((dy) => (
          <div
            key={`${dy.ganZhi}-${dy.startAge}`}
            className="border border-dai-qing/15 rounded p-2 text-center"
          >
            <div className="font-serif-display text-xl text-ink-900">{dy.ganZhi}</div>
            <div className="text-xs text-ink-500 mt-0.5">
              {dy.startAge}-{dy.endAge} 岁
            </div>
            <div className="text-xs text-ink-300">
              {dy.startYear}-{dy.endYear}
            </div>
            <span
              className={`inline-block mt-1 px-2 py-0.5 text-xs rounded border ${TIER_STYLE[dy.assessment.tier]}`}
            >
              {TIER_LABEL[dy.assessment.tier]} · {dy.assessment.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
