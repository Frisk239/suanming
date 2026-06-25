// src/lib/ask/token-estimator.ts
// 本地 token 估算（spec 5.5）。中文1字≈1.5token，英文按词。
// 阈值判断够用（compact 100K 触发判断），不需精确到个位、不需 API 调用。

/**
 * 估算文本 token 数。
 * 中文按字（CJK 统一汉字范围），每字 1.5 token；
 * 非中文按空白分词，每词 1.3 token。
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // CJK 统一汉字范围
  const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  // 非中文字符按空白分词
  const nonCjk = text
    .replace(/[\u4e00-\u9fff]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.ceil(cjk * 1.5 + nonCjk * 1.3);
}
