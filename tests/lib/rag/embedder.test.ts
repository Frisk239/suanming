// tests/lib/rag/embedder.test.ts
// embedder HTTP 客户端测试（mock fetch，不依赖运行的微服务）。
// embedder 现在是 Python 微服务的 HTTP 客户端，不再本地加载模型。

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { embed, embedBatch } from '@/lib/rag/embedder';

// 默认 EMBED_URL=http://127.0.0.1:8765（embedder.ts 内部读 env）

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe('embedder · HTTP 客户端', () => {
  it('embed 应 POST /embed 并返回向量', async () => {
    const fakeVec = Array.from({ length: 1024 }, () => 0.1);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ embedding: fakeVec }),
    });
    const vec = await embed('七杀格喜印化');
    expect(vec.length).toBe(1024);
    // 验证请求构造正确
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('http://127.0.0.1:8765/embed');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ text: '七杀格喜印化' });
  });

  it('embed 服务返回非 ok 应抛错含状态码', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'server err' });
    await expect(embed('x')).rejects.toThrow(/500/);
  });

  it('embedBatch 应 POST /embed-batch 并返回向量数组', async () => {
    const vec = Array.from({ length: 1024 }, () => 0.2);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ embeddings: [vec, vec] }),
    });
    const vecs = await embedBatch(['甲', '乙']);
    expect(vecs.length).toBe(2);
    expect(vecs[0].length).toBe(1024);
    const [, opts] = mockFetch.mock.calls[0];
    expect(JSON.parse(opts.body)).toEqual({ texts: ['甲', '乙'] });
  });

  it('embedBatch 请求 URL 应是 /embed-batch', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ embeddings: [] }) });
    await embedBatch([]);
    expect(mockFetch.mock.calls[0][0]).toBe('http://127.0.0.1:8765/embed-batch');
  });
});
