// src/components/bazi/BirthForm.tsx
// 录入表单（spec 5.5）。原生控件 + Tailwind，对齐青囊字段。
// 借鉴 mingyu InputPage.PersonForm：性别按钮组、年月日 select、时辰选择、真太阳时切换。

'use client';

import { useState } from 'react';
import type { BirthFormState } from '@/types/ui';
import type { ChartInput } from '@/types/bazi';

const YEARS = Array.from({ length: 107 }, (_, i) => 2026 - i); // 1920-2026
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

// 12 时辰名（子丑寅卯辰巳午未申酉戌亥），每个时辰跨 2 小时，子时跨日界。
// 23:00-00:59 子，01-02 丑，03-04 寅，依此类推。spec 5.5「实时显示时辰名」。
const ZHI_NAMES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
function hourToZhi(hour: number): string {
  // 23-24 和 0 都属子时（跨日）；其余 hour 为奇数时辰取 (hour+1)/2
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
    ...initial,
  });
  const [error, setError] = useState('');

  const set = <K extends keyof BirthFormState>(k: K, v: BirthFormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    setError('');
    if (!form.year || !form.month || !form.day) {
      setError('请填写完整出生日期');
      return;
    }
    const input: ChartInput = {
      name: form.name || undefined,
      gender: form.gender,
      solarDate: `${form.year}-${form.month.padStart(2, '0')}-${form.day.padStart(
        2,
        '0',
      )} ${form.hour.padStart(2, '0')}:${form.minute.padStart(2, '0')}`,
      isLunar: form.isLunar,
      // 城市名：后端经 bazi-core cityCache 查经纬度。
      // 开发机若有中文编码问题可改传 longitude（M1 经验，前端 fetch UTF-8 一般无此问题）。
      city: form.city,
      useTrueSolar: form.useTrueSolar,
      sect: form.sect,
    };
    onSubmit(input);
  };

  const hourNum = Number(form.hour);
  const zhiName = isNaN(hourNum) ? '' : `${hourToZhi(hourNum)}时`;

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-sm border border-ink-100 p-6 space-y-4">
      <h1 className="font-serif-display text-2xl text-ink-900 text-center tracking-[0.3em]">
        八 字 排 盘
      </h1>

      {/* 称谓 */}
      <Field label="称谓">
        <input
          className="input"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="（可选）如：己身"
        />
      </Field>

      {/* 性别（按钮组，对齐青囊「男(乾造)/女(坤造)」） */}
      <Field label="性别">
        <div className="flex gap-2">
          {(['male', 'female'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => set('gender', g)}
              className={`seg-btn ${form.gender === g ? 'seg-btn-active' : ''}`}
            >
              {g === 'male' ? '男（乾造）' : '女（坤造）'}
            </button>
          ))}
        </div>
      </Field>

      {/* 出生日期（公历下拉，spec 5.5） */}
      <Field label="出生日期">
        <div className="flex gap-2 items-center">
          <select
            className="input"
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
          <select
            className="input"
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
          <select
            className="input"
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
        </div>
      </Field>

      {/* 时辰（HH:MM，实时显示时辰名，spec 5.5） */}
      <Field label={`时辰${zhiName ? `（${zhiName}）` : ''}`}>
        <div className="flex gap-2 items-center">
          <select
            className="input"
            value={form.hour}
            onChange={(e) => set('hour', e.target.value)}
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, '0')}
              </option>
            ))}
          </select>
          <span className="text-ink-500">:</span>
          <select
            className="input"
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
      </Field>

      {/* 出生地（文本，M5 加省市级联，spec 5.5） */}
      <Field label="出生地">
        <input
          className="input"
          value={form.city}
          onChange={(e) => set('city', e.target.value)}
          placeholder="如：北京"
        />
      </Field>

      {/* 高级选项（折叠：真太阳时 / 子时流派，spec 5.5） */}
      <details className="text-sm text-ink-500">
        <summary className="cursor-pointer">高级排盘选项</summary>
        <div className="mt-2 space-y-2 pl-1">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.useTrueSolar}
              onChange={(e) => set('useTrueSolar', e.target.checked)}
            />
            真太阳时（按出生地经度校正）
          </label>
          <label className="flex items-center gap-2">
            <span>子时分日：</span>
            <select
              value={form.sect}
              onChange={(e) => set('sect', Number(e.target.value) === 2 ? 2 : 1)}
            >
              <option value={1}>早子时（23 点算次日）</option>
              <option value={2}>晚子时（23 点算当日）</option>
            </select>
          </label>
        </div>
      </details>

      {error && <p className="text-wx-huo text-sm">{error}</p>}

      <button
        onClick={submit}
        disabled={loading}
        className="w-full py-2 bg-ink-900 text-ink-50 rounded font-serif-display tracking-widest hover:bg-ink-700 disabled:opacity-50 transition-colors"
      >
        {loading ? '排盘中…' : '开启推演'}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-ink-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
