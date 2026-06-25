// scripts/eval-bazi.ts
// M6a ②层引擎评估脚本（spec 3.2）。
// 跑 EVAL_CASES，对比自研引擎输出 vs 文献共识，逐字段定位分歧。
// 用法：npx tsx scripts/eval-bazi.ts
// M6c 修复后重跑此脚本做回归验证。

import { adaptBaziCore } from '@/lib/bazi/bazi-core-adapter';
import { analyzeBazi } from '@/lib/bazi-engine';
import { EVAL_CASES } from './eval-cases';

type Field = 'strength' | 'pattern' | 'yongshen';

interface FieldDiff {
  field: Field;
  engine: string;
  consensus: string;
}

interface CaseResult {
  name: string;
  category: string;
  /** 引擎排出的四柱（核对用） */
  ganZhi: string;
  engine: { strength: string; pattern: string; yongshen: string; method: string };
  consensus: { strength: string; pattern: string; yongshen: string };
  diffs: FieldDiff[];
  /** 三字段全一致 */
  agreed: boolean;
}

function evalCase(c: (typeof EVAL_CASES)[number]): CaseResult {
  const chart = adaptBaziCore(c.input);
  const result = analyzeBazi(chart);
  const engine = {
    strength: result.strength.level,
    pattern: result.pattern.name,
    yongshen: result.yongshen.primary,
    method: result.yongshen.method,
  };
  const ganZhi = `${chart.year.ganZhi} ${chart.month.ganZhi} ${chart.day.ganZhi} ${chart.time.ganZhi}`;
  const diffs: FieldDiff[] = [];
  (['strength', 'pattern', 'yongshen'] as Field[]).forEach((f) => {
    if (engine[f] !== c.consensus[f]) {
      diffs.push({ field: f, engine: engine[f], consensus: c.consensus[f] });
    }
  });
  return {
    name: c.name,
    category: c.category,
    ganZhi,
    engine,
    consensus: c.consensus,
    diffs,
    agreed: diffs.length === 0,
  };
}

function main() {
  console.log('=== M6a ②层引擎评估 ===\n');
  const results = EVAL_CASES.map(evalCase);
  const agreed = results.filter((r) => r.agreed).length;
  console.log(`一致率：${agreed}/${results.length}（三字段全一致）\n`);

  console.log('=== 逐案例 ===');
  for (const r of results) {
    const mark = r.agreed ? '✅' : '⚠️';
    console.log(`${mark} ${r.name} [${r.category}]  四柱: ${r.ganZhi}`);
    console.log(
      `   引擎: ${r.engine.strength} / ${r.engine.pattern} / 用神${r.engine.yongshen}（${r.engine.method}）`
    );
    console.log(
      `   共识: ${r.consensus.strength} / ${r.consensus.pattern} / 用神${r.consensus.yongshen}`
    );
    for (const d of r.diffs) {
      console.log(`   分歧[${d.field}]: 引擎=${d.engine} vs 共识=${d.consensus}`);
    }
    console.log('');
  }

  console.log('=== 分歧汇总（供 M6c 修复）===');
  const allDiffs = results.flatMap((r) =>
    r.diffs.map((d) => ({ ...d, name: r.name, category: r.category }))
  );
  if (allDiffs.length === 0) {
    console.log('无分歧，②层引擎与全部案例一致。');
  } else {
    // 按字段聚合，便于看出引擎在哪类字段系统性偏差
    const byField: Record<string, typeof allDiffs> = {};
    for (const d of allDiffs) {
      (byField[d.field] ??= []).push(d);
    }
    console.log(`共 ${allDiffs.length} 处分歧：`);
    for (const [field, diffs] of Object.entries(byField)) {
      console.log(`\n  [${field}] ${diffs.length} 处：`);
      for (const d of diffs) {
        console.log(`    - ${d.name}[${d.category}]: 引擎=${d.engine} / 共识=${d.consensus}`);
      }
    }
  }

  console.log('\n（将以上输出整理进 docs/m6-eval-report.md）');
}

main();
