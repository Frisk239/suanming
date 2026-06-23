// src/lib/llm/prompt.ts
// 四段式 prompt（spec 4.5，综合开源核验）。
// 借鉴：
//   - FOR-BAZI build_system_prompt："绝对真理，禁止篡改"标签保护②层数据
//   - metaphysics-classics-guide：依据→推演→结论→边界，"不确定项"对抗幻觉
//   - suangua _build_interpret_prompt：summary JSON + classical_ctx + 步骤指令
//   - bazi-mingli ETHICS：避免极端恐吓，健康以医学为准

import type { InterpretInput } from './types';

const PERSONA_DESC: Record<string, string> = {
  scholar: '严谨学者：客观、专业、克制，如博导般引经据典、逻辑严密',
  hermit: '幽默隐士：随性、风趣、一针见血，如酒后老友般生动比喻',
};
const DEPTH_DESC: Record<string, string> = {
  standard: '专业级：完整推演，术语准确，可深入',
  popular: '通俗级：直给结论，少术语，多比喻',
};

/** 系统 prompt（角色 + 约束 + 输出结构 + 伦理） */
export function buildSystemPrompt(input: InterpretInput): string {
  const { options } = input;
  return `你是一位中国传统四柱八字命理研究者。

【人格设定】${PERSONA_DESC[options.persona]}
【解读深度】${DEPTH_DESC[options.depth]}

【核心约束】
1. 下方的"命盘数据"是【绝对真理，禁止篡改】——不得修改四柱、十神、格局、用神等已确定数据
2. 古籍引用【必须来自下方"古籍依据"】，不得编造未给出的引用；若需引用而无依据，明确说"暂无直接典籍依据"
3. 不确定的判断必须显式列入"边界"段，不得伪装确定
4. 避免极端恐吓或绝对化断语；健康问题以现代医学为准；结局给予正向引导

【输出结构 · 四段式】（严格按此结构，每段用 markdown 标题）
## 依据
本盘核心格局/用神/病灶的典籍依据（引上方古籍原文，标注《书名·章节》）

## 推演
从依据到结论的命理逻辑链（结合大运叙事种子）

## 结论
分项给出：事业、财运、婚姻、健康（每项 2-3 句）

## 边界
- 不确定项（明确列出）
- 文化研究声明："本解读仅供传统文化研究，不构成任何决策建议"`;
}

/** 用户 prompt（命盘数据 + 叙事种子 + 古籍依据） */
export function buildUserPrompt(input: InterpretInput): string {
  const { chartSummary, analysis, classics } = input;
  const pillarsStr = chartSummary.pillars.join(' ');

  // 古籍依据格式化（content 截断 400 字防 prompt 过长）
  const classicsStr =
    classics.length > 0
      ? classics
          .map((r, i) => {
            const c = r.chunk;
            const trans = c.translation ? `\n  白话：${c.translation}` : '';
            return `${i + 1}. 《${c.book}·${c.chapter}》原文：${c.content.slice(0, 400)}${trans}`;
          })
          .join('\n\n')
      : '（本次未检索到高度相关古籍，请基于通识谨慎推演，并标注）';

  // 大运叙事种子（前 4 步）
  const dayunSeeds = analysis.daYuns
    .slice(0, 4)
    .map((d) => `${d.ganZhi}(${d.startAge}-${d.endAge}岁, ${d.assessment.tier}): ${d.narrativeSeed.join('；')}`)
    .join('\n');

  return `【命盘数据 · 绝对真理，禁止篡改】
日主：${chartSummary.dayMaster}
性别：${chartSummary.gender}
公历：${chartSummary.solarDate}
农历：${chartSummary.lunarDate}
四柱：${pillarsStr}

【②层规则引擎解读结果】
日主强弱：${analysis.strength.level}（综合分 ${analysis.strength.score}，得令${analysis.strength.deLingBool ? '是' : '否'}/得地${analysis.strength.deDiBool ? '是' : '否'}/得势${analysis.strength.deShiBool ? '是' : '否'}）
格局：${analysis.pattern.name}（${analysis.pattern.basis}）
用神：${analysis.yongshen.primary}（${analysis.yongshen.method}法）喜${analysis.yongshen.favor.join('')} 忌${analysis.yongshen.avoid.join('')}

【大运叙事种子（前4步）】
${dayunSeeds}

【古籍依据 · 引用必须来自此处，不得编造】
${classicsStr}

请按四段式结构（依据/推演/结论/边界）撰写完整解读。`;
}
