// src/components/bazi/InterpretView.tsx
// 详批纯展示组件（M8 历史详情页用）。
// 与 InterpretPanel 的区别：InterpretPanel 是流式 + persona/depth 切换 + hook；
// 本组件只读渲染已生成的详批全文，无交互、无 hook。复用 AskMarkdown 渲染华彩段落。

import { AskMarkdown } from './AskMarkdown';

interface Props {
  /** interpret 全文（## 四段 + ### 主题，AskMarkdown 统一渲染） */
  content: string;
  /** 生成时间（展示用，可选） */
  createdAt?: string;
}

export function InterpretView({ content, createdAt }: Props) {
  return (
    <section className="rounded-2xl border border-dai-qing/10 bg-xuan-zhi p-6 space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-base text-dai-qing">详批全文</h2>
        {createdAt && (
          <span className="text-[10px] tracking-[0.2em] text-hu-po-jin/55">
            {new Date(createdAt).toLocaleDateString('zh-CN')}
          </span>
        )}
      </div>
      <div className="border-t border-dai-qing/10 pt-4">
        <AskMarkdown content={content} />
      </div>
    </section>
  );
}
