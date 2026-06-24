// src/components/bazi/BirthForm.tsx
// 录入表单（spec 5.5，11-bazi.html 深度复刻）。
//
// 逻辑保留 M4（initial 过滤、表单状态、submit 组装 ChartInput、时辰名实时显示），
// UI 换成华彩招牌：
//   - 双层框卡片（外黛青边 + 内琥珀金细边 inset 7px）
//   - 深色黛青渐变头部「青囊·庚帖 八字排盘」流光大字 + 朱砂印章悬浮右上
//   - qn-inkline 墨线下划线输入 + 乾坤定性滑块 + 光泽扫过提交按钮
//
// 表单结构按后端实际需要（gender/solarDate/city/useTrueSolar/sect），原型是参考。

'use client';

import { useState } from 'react';
import type { BirthFormState } from '@/types/ui';
import type { ChartInput } from '@/types/bazi';
import { CITIES, PROVINCES, findCity } from '@/config/cities';

const YEARS = Array.from({ length: 107 }, (_, i) => 2026 - i); // 1920-2026
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

// 12 时辰名（子丑寅卯辰巳午未申酉戌亥），每个时辰跨 2 小时，子时跨日界。
const ZHI_NAMES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
function hourToZhi(hour: number): string {
  if (hour === 23 || hour === 0) return '子';
  return ZHI_NAMES[Math.floor((hour + 1) / 2)];
}

interface Props {
  /** 初始值（从分享 URL 复现时传入） */
  initial?: Partial<BirthFormState>;
  /** 提交回调，拿到组装好的 ChartInput */
  onSubmit: (input: ChartInput) => void;
  loading?: boolean;
}

export function BirthForm({ initial, onSubmit, loading }: Props) {
  // 过滤 initial 里的 undefined —— 直接 ...initial 会让 undefined 覆盖默认值，
  // 导致 input 受控/非受控切换警告 + padStart 等字符串方法在 undefined 上崩溃。
  const overrides = Object.fromEntries(
    Object.entries(initial ?? {}).filter(([, v]) => v !== undefined),
  );
  const [form, setForm] = useState<BirthFormState>({
    name: '',
    gender: 'male',
    year: '1990',
    month: '6',
    day: '15',
    hour: '22',
    minute: '37',
    isLunar: false,
    city: '北京',
    useTrueSolar: true,
    sect: 1,
    ...overrides,
  });
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 省市级联：从 form.city 反查所在省（分享 URL 复现时还原下拉）
  const initialProvince =
    PROVINCES.find((p) => CITIES[p].some((c) => c.name === form.city)) ?? '直辖市';
  const [province, setProvince] = useState(initialProvince);

  const set = <K extends keyof BirthFormState>(k: K, v: BirthFormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    setError('');
    if (!form.year || !form.month || !form.day || !form.hour || !form.minute) {
      setError('请填写完整出生日期和时辰');
      return;
    }
    // 从城市表查经纬度（绕过 bazi-core cityCache，真太阳时校正稳定）
    const coord = findCity(form.city);
    const input: ChartInput = {
      name: form.name || undefined,
      gender: form.gender,
      solarDate: `${form.year}-${form.month.padStart(2, '0')}-${form.day.padStart(
        2,
        '0',
      )} ${form.hour.padStart(2, '0')}:${form.minute.padStart(2, '0')}`,
      isLunar: form.isLunar,
      city: form.city,
      longitude: coord?.lng,
      latitude: coord?.lat,
      useTrueSolar: form.useTrueSolar,
      sect: form.sect,
    };
    onSubmit(input);
  };

  const hourNum = Number(form.hour);
  const zhiName = isNaN(hourNum) ? '' : `${hourToZhi(hourNum)}时`;

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* 双层框排盘卡片 */}
      <div className="chart-card relative w-full rounded-md border border-dai-qing/15 shadow-[0_24px_60px_-20px_rgba(0,51,51,0.28)] bg-xuan-zhi overflow-hidden">
        {/* ★ 内层琥珀金细边（inset 7px，11-bazi.html 实测） */}
        <span className="pointer-events-none absolute inset-[7px] z-20 rounded border border-hu-po-jin/25" />

        {/* 深色头部（黛青渐变 + 流光标题） */}
        <div className="relative overflow-hidden bg-gradient-to-b from-dai-qing-dark to-dai-qing px-8 py-9 text-center">
          <div className="flex items-center justify-center gap-3 text-[10px] tracking-[0.4em] text-hu-po-jin/60">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-hu-po-jin/45" />
            <span>青 囊 · 庚 帖</span>
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-hu-po-jin/45" />
          </div>
          <h1 className="mt-4 flex justify-center gap-0 font-serif font-bold text-[clamp(34px,5vw,46px)]">
            {['八', '字', '排', '盘'].map((ch) => (
              <span key={ch} className="qn-glow-breathe text-hu-po-jin">
                {ch}
              </span>
            ))}
          </h1>
          <p className="mt-3 font-serif text-sm text-xuan-zhi/55 leading-relaxed">
            天道有常，缘者自寻。录入诞辰，共振星寰。
          </p>
        </div>

        {/* 表单区（玄纸底） */}
        <div className="px-10 py-10 space-y-8 bg-xuan-zhi">
          {/* 称谓 */}
          <FieldGroup label="✦ 有缘人之称谓">
            <InkLine
              value={form.name}
              onChange={(v) => set('name', v)}
              placeholder="请输入有缘人的称呼（如：某居士、己身）"
            />
          </FieldGroup>

          {/* 乾坤定性（滑块切换，11-bazi.html 招牌） */}
          <FieldGroup label="✦ 乾坤定性">
            <div className="relative w-full h-14 bg-xuan-zhi-dark rounded-md p-1 flex items-center border border-dai-qing/15">
              {/* 滑块 */}
              <div
                className={`absolute h-12 bg-dai-qing rounded shadow-[0_4px_12px_rgba(0,0,0,0.2)] transition-transform duration-300 left-1 w-[calc(50%-6px)] ${
                  form.gender === 'female' ? 'translate-x-full' : ''
                }`}
              />
              <div className="relative flex w-full z-[1] text-sm tracking-[0.15em]">
                {(['male', 'female'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => set('gender', g)}
                    className={`flex-1 py-2 transition-colors ${
                      form.gender === g
                        ? 'text-hu-po-jin font-bold'
                        : 'text-dai-qing/50'
                    }`}
                  >
                    {g === 'male' ? '男（乾造）' : '女（坤造）'}
                  </button>
                ))}
              </div>
            </div>
          </FieldGroup>

          {/* 诞辰之候（年月日 + 时辰） */}
          <FieldGroup label={`✦ 诞辰之候${zhiName ? `（${zhiName}）` : ''}`}>
            <div className="grid grid-cols-4 gap-3">
              <DateCell label="年">
                <select
                  className="qn-date-select"
                  value={form.year}
                  onChange={(e) => set('year', e.target.value)}
                >
                  <option value="">年</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </DateCell>
              <DateCell label="月">
                <select
                  className="qn-date-select"
                  value={form.month}
                  onChange={(e) => set('month', e.target.value)}
                >
                  <option value="">月</option>
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </DateCell>
              <DateCell label="日">
                <select
                  className="qn-date-select"
                  value={form.day}
                  onChange={(e) => set('day', e.target.value)}
                >
                  <option value="">日</option>
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </DateCell>
              <DateCell label="时">
                <div className="flex items-center justify-center gap-0.5">
                  <select
                    className="qn-date-select w-12"
                    value={form.hour}
                    onChange={(e) => set('hour', e.target.value)}
                  >
                    {HOURS.map((h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                  <span className="text-dai-qing font-bold">:</span>
                  <select
                    className="qn-date-select w-12"
                    value={form.minute}
                    onChange={(e) => set('minute', e.target.value)}
                  >
                    {MINUTES.map((m) => (
                      <option key={m} value={m}>
                        {String(m).padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                </div>
              </DateCell>
            </div>
          </FieldGroup>

          {/* 诞生之地（省市级联下拉，选市自动带经纬度） */}
          <FieldGroup label="✦ 诞生之地">
            <div className="grid grid-cols-2 gap-3">
              <DateCell label="省/市">
                <select
                  className="qn-date-select"
                  value={province}
                  onChange={(e) => {
                    const p = e.target.value;
                    setProvince(p);
                    // 切省时自动选该省第一个城市
                    const firstCity = CITIES[p][0];
                    if (firstCity) set('city', firstCity.name);
                  }}
                >
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </DateCell>
              <DateCell label="市">
                <select
                  className="qn-date-select"
                  value={form.city}
                  onChange={(e) => set('city', e.target.value)}
                >
                  {CITIES[province]?.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </DateCell>
            </div>
          </FieldGroup>

          {/* 高级排盘选项（折叠） */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowAdvanced((s) => !s)}
              className="flex items-center gap-2 text-[11px] tracking-[0.25em] text-hu-po-jin-dark hover:text-hu-po-jin transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"></path></svg>
              高级排盘选项
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showAdvanced ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }}><path d="M6 9l6 6 6-6"></path></svg>
            </button>
          </div>

          {showAdvanced && (
            <div className="space-y-3 pl-1 -mt-2">
              <label className="flex items-center gap-2 text-sm text-dai-qing/70">
                <input
                  type="checkbox"
                  checked={form.useTrueSolar}
                  onChange={(e) => set('useTrueSolar', e.target.checked)}
                />
                真太阳时（按出生地经度校正）
              </label>
              <label className="flex items-center gap-2 text-sm text-dai-qing/70">
                <span>子时分日：</span>
                <select
                  className="qn-date-select flex-1"
                  value={form.sect}
                  onChange={(e) => set('sect', Number(e.target.value) === 2 ? 2 : 1)}
                >
                  <option value={1}>早子时（23 点算次日）</option>
                  <option value={2}>晚子时（23 点算当日）</option>
                </select>
              </label>
            </div>
          )}

          {error && <p className="text-vermillion text-sm text-center">{error}</p>}

          {/* 提交按钮：琥珀金底 + 光泽扫过（11-bazi.html submit-btn） */}
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="qn-sheen-sweep relative w-full py-5 mt-1 bg-hu-po-jin text-dai-qing-dark rounded-md font-serif text-[15px] tracking-[0.6em] font-bold shadow-[0_10px_30px_rgba(212,175,55,0.3)] transition-all disabled:opacity-50 overflow-hidden"
          >
            {loading ? '推 演 中…' : '开 启 推 演（免费）'}
          </button>
        </div>

        <div className="px-10 pb-8 text-center text-[10px] text-dai-qing/25 tracking-[0.1em]">
          CYAN CODEX · TRADITIONAL LOGIC · POWERED BY AI
        </div>
      </div>

      {/* ★ 朱砂印章「庚帖」（放卡片外层 wrapper 内，z:50 压过金边，不被 overflow:hidden 裁掉） */}
      <div className="absolute -top-4 right-7 z-50 flex rotate-[-4deg] flex-col gap-[3px] rounded bg-[var(--seal-red)] px-[7px] py-2 font-serif text-[13px] font-semibold leading-none text-[#f7f2e7] shadow-[inset_0_0_0_1.5px_rgba(247,242,231,0.5),inset_0_0_10px_rgba(63,12,8,0.3),0_2px_10px_rgba(168,57,46,0.22)]">
        <span>庚</span>
        <span>帖</span>
      </div>
    </div>
  );
}

/** 字段分组（label + 内容，11-bazi.html field-group） */
function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-dai-qing/50 tracking-[0.15em] mb-3">
        <span>{label}</span>
      </div>
      {children}
    </div>
  );
}

/** 年月日时下拉格（11-bazi.html date-cell） */
function DateCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#e8e4c9] p-3 rounded border border-dai-qing/15 text-center transition-colors hover:border-hu-po-jin/40 relative">
      <span className="block text-[10px] text-dai-qing/40 mb-1">{label}</span>
      {children}
    </div>
  );
}

/**
 * 墨线下划线输入（qn-inkline，11-bazi.html 招牌样式）。
 * 透明背景 + 底部细线，focus 时琥珀金高亮线展开。
 */
function InkLine({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <span className="relative block">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className="w-full bg-transparent border-0 border-b border-dai-qing/20 outline-none px-1 py-3 text-dai-qing text-lg placeholder:text-dai-qing/25 focus:border-transparent transition-colors"
      />
      <span
        className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-hu-po-jin to-hu-po-jin/30 origin-left transition-transform duration-300"
        style={{ transform: focused ? 'scaleX(1)' : 'scaleX(0)' }}
      />
    </span>
  );
}
