// src/components/bazi/ChartBoard.tsx
// 四柱排盘展示（spec 5.5）。借鉴 mingyu BaziChartBoard 的多行展开表。
// 行：天干 / 主星(天干十神) / 地支 / 副星(地支藏干十神) / 藏干 / 纳音 / 空亡 / 地势 / 神煞。
// 日柱高亮（accent 色，标「日主」）。

import type { BaziChart, Pillar } from '@/types/bazi';
import { WuxingBadge } from './WuxingBadge';

interface Props {
  chart: BaziChart;
}

export function ChartBoard({ chart }: Props) {
  const pillars: { label: string; p: Pillar; isDay: boolean }[] = [
    { label: '年柱', p: chart.year, isDay: false },
    { label: '月柱', p: chart.month, isDay: false },
    { label: '日柱', p: chart.day, isDay: true },
    { label: '时柱', p: chart.time, isDay: false },
  ];

  return (
    <div className="bg-xuan-zhi rounded-lg shadow-sm border border-dai-qing/15 p-6">
      {/* 头部（spec 5.5：乾造/坤造 · 城市 · 真太阳时 · 公历 · 农历） */}
      <div className="text-center mb-4 pb-4 border-b border-dai-qing/15">
        <h2 className="font-serif-display text-xl text-dai-qing-dark tracking-widest">
          {chart.gender === 'male' ? '乾造' : '坤造'}
          {chart.city ? ` · ${chart.city}` : ''}
        </h2>
        <p className="text-sm text-dai-qing/60 mt-1">
          公历 {chart.solarDate}
          {chart.trueSolarTime ? ` · 真太阳时 ${chart.trueSolarTime}` : ''}
        </p>
        {chart.lunarDate && (
          <p className="text-sm text-dai-qing/60">农历 {chart.lunarDate}</p>
        )}
      </div>

      {/* 四柱表（行展开式，spec 5.5） */}
      <table className="w-full text-center border-collapse">
        <thead>
          <tr className="text-sm text-dai-qing/60">
            <th className="w-16"></th>
            {pillars.map(({ label, isDay }) => (
              <th
                key={label}
                className={`py-2 ${isDay ? 'text-accent font-semibold' : ''}`}
              >
                {label}
                {isDay ? '（日主）' : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* 天干（衬线大字） */}
          <Row label="天干" big>
            {pillars.map(({ label, p, isDay }) => (
              <td key={label} className={`py-2 ${isDay ? 'text-accent' : 'text-dai-qing-dark'}`}>
                {p.gan}
              </td>
            ))}
          </Row>
          {/* 主星 = 天干十神 */}
          <Row label="主星">
            {pillars.map(({ label, p }) => (
              <td key={label} className="text-dai-qing/60">
                {p.shiShenGan}
              </td>
            ))}
          </Row>
          {/* 地支（衬线大字） */}
          <Row label="地支" big>
            {pillars.map(({ label, p }) => (
              <td key={label} className="text-dai-qing-dark">
                {p.zhi}
              </td>
            ))}
          </Row>
          {/* 副星 = 地支藏干十神 */}
          <Row label="副星">
            {pillars.map(({ label, p }) => (
              <td key={label} className="text-dai-qing/60">
                {p.shiShenZhi.join(' ')}
              </td>
            ))}
          </Row>
          {/* 藏干 */}
          <Row label="藏干">
            {pillars.map(({ label, p }) => (
              <td key={label} className="text-dai-qing/60">
                {p.hideGan.join(' ')}
              </td>
            ))}
          </Row>
          {/* 纳音（五行色） */}
          <Row label="纳音">
            {pillars.map(({ label, p }) => (
              <td key={label}>
                <WuxingBadge wx={p.wuXing}>{p.naYin}</WuxingBadge>
              </td>
            ))}
          </Row>
          {/* 空亡（单值 string，可能为空） */}
          <Row label="空亡">
            {pillars.map(({ label, p }) => (
              <td key={label} className="text-dai-qing/40">
                {p.kongWang || '—'}
              </td>
            ))}
          </Row>
          {/* 地势 = 日主对地支十二长生 */}
          <Row label="地势">
            {pillars.map(({ label, p }) => (
              <td key={label} className="text-dai-qing/60">
                {p.diShi}
              </td>
            ))}
          </Row>
          {/* 神煞（数组，对齐青囊排盘明细） */}
          <Row label="神煞">
            {pillars.map(({ label, p }) => (
              <td key={label} className="text-dai-qing/40 text-xs">
                {p.shenSha.length ? p.shenSha.join(' ') : '—'}
              </td>
            ))}
          </Row>
        </tbody>
      </table>
    </div>
  );
}

/** 表格行壳：label 列固定窄，数据列均分。big 用衬线大字。 */
function Row({
  label,
  big,
  children,
}: {
  label: string;
  big?: boolean;
  children: React.ReactNode;
}) {
  return (
    <tr className={`border-t border-dai-qing/15 ${big ? 'font-serif-display text-2xl' : 'text-sm'}`}>
      <td className="text-left text-dai-qing/60 pr-2 whitespace-nowrap">{label}</td>
      {children}
    </tr>
  );
}
