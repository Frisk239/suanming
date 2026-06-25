// src/types/ui.ts
// 前端 UI 状态类型（spec 第 5 节前端）。前端独有状态在此定义；
// 详批选项 InterpretOptions 复用后端 @/lib/llm/types，单一来源避免漂移。

import type { BaziChart } from './bazi';
import type { BaziAnalysisResult } from '@/lib/bazi-engine';

// interpret 的人格/深度选项：re-export 后端定义（前后端同结构，单一来源）。
// 后端 src/lib/llm/types.ts: Persona = 'scholar' | 'hermit'
//                              Depth = 'standard' | 'popular'
export type { Persona, Depth, InterpretOptions } from '@/lib/llm/types';

/** 页面阶段（状态机，spec 5.8 线性数据流） */
export type AppStage = 'input' | 'loading' | 'result' | 'interpreting';

/**
 * 录入表单状态（spec 5.5 录入字段）。
 * 日期/时辰拆成下拉值（year/month/day/hour/minute 都是字符串），
 * submit 时拼成 ChartInput.solarDate。
 */
export interface BirthFormState {
  name: string;
  gender: 'male' | 'female';
  year: string; // "1990"
  month: string; // "6"
  day: string; // "15"
  hour: string; // "22"
  minute: string; // "37"
  isLunar: boolean;
  /** 城市名（文本输入；M5 加省市级联，spec 5.5） */
  city: string;
  longitude?: number;
  latitude?: number;
  useTrueSolar: boolean;
  /** 子时分日流派：1=早子时（23点算明天），2=晚子时（23点算今天） */
  sect: 1 | 2;
}

/** 排盘结果（页面状态：①层 chart + ②层 analysis，一次 analyze 调用同时拿到） */
export interface ChartState {
  chart: BaziChart;
  analysis: BaziAnalysisResult;
  /** M7：登录用户排盘建的 birth_profile id（追问 API 入参）。未登录为 null */
  profileId?: string;
}

/**
 * 模块配置（spec M5 可扩展导航）。modules.ts 注册所有 Tab，
 * TopNav/BottomNav 据此渲染。新增模块只改 modules.ts，不改组件。
 */
export type ModuleStatus = 'live' | 'soon';

export interface ModuleConfig {
  /** 路由 id，同时是 URL 段（如 'bazi' → /bazi） */
  id: string;
  /** 显示名（八字/紫微/六爻/合盘） */
  label: string;
  /** 中文副标题/说明（占位页用） */
  tagline: string;
  /** 上线状态：live=可用，soon=未上线占位 */
  status: ModuleStatus;
  /** 导航排序（升序） */
  order: number;
  /** 底部导航是否固定展示（核心模块） */
  pinnedBottom?: boolean;
  /** 单字图标（青囊功能卡片用，如 '命'/'卦'/'紫'） */
  icon?: string;
  /** 底部导航图标键（指向 NavIcon 的图标，如 'bazi'/'ziwei'/'liuyao'/'hepan'）。
   *  pinnedBottom 模块必填，BottomNav 据此渲染对应 SVG。新增模块加一项即可。 */
  bottomIcon?: 'bazi' | 'ziwei' | 'liuyao' | 'hepan' | 'home' | 'more' | 'user';
}
