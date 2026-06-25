// src/lib/ask/topic-detector.ts
// 追问主题偏离检测（spec 5.3）。
//
// ⚠️ 最高约束2：用关键词匹配，绝不用 LLM 做偏离检测（杀鸡牛刀+增延迟）。
// 命中解读已涉及的五主题（事业/财运/婚姻/健康/家人六亲）→ 不检索（纯注入省 RAG）；
// 未命中 → 定向 RAG 检索补古籍防幻觉。
//
// 词表对应解读结论段的 ### 五主题（prompt.ts）。

/** 五大主题的关键词表（命中任一即算该主题覆盖） */
const TOPIC_KEYWORDS: Record<string, string[]> = {
  事业: ['事业', '工作', '职业', '升迁', '官', '职场', '前程', '仕途', '事业运'],
  财运: ['财', '钱', '富', '收入', '投资', '破财', '旺财', '财运', '发财'],
  婚姻感情: ['婚', '姻', '感情', '桃花', '配偶', '对象', '恋爱', '夫妻', '姻缘'],
  健康: ['健康', '病', '疾', '身体', '寿', '脾胃', '肝', '养生'],
  家人六亲: ['父', '母', '子女', '六亲', '家人', '兄弟', '父母', '长辈', '后代'],
};

/** 所有主题词展平（命中任一即算追问落在已涉及主题内） */
const ALL_KEYWORDS = Object.values(TOPIC_KEYWORDS).flat();

/**
 * 追问是否落在已涉及主题内（命中任一主题词即算命中）。
 * 命中 → 追问 API 不做兜底 RAG（纯注入，省开销）。
 */
export function isTopicCovered(question: string): boolean {
  return ALL_KEYWORDS.some((kw) => question.includes(kw));
}

/** 命中了哪些主题（调试/未来扩展用） */
export function matchedTopics(question: string): string[] {
  return Object.entries(TOPIC_KEYWORDS)
    .filter(([, kws]) => kws.some((kw) => question.includes(kw)))
    .map(([topic]) => topic);
}
