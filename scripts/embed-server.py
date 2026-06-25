#!/usr/bin/env python
# scripts/embed-server.py
# BGE-M3 embedding 微服务（FastAPI + GPU/CPU）。
# 统一建库 + 查询的 embedding：同一模型(BAAI/bge-m3) + 同一实现(fp16 GPU / fp32 CPU)，
# 向量空间完全一致（修复之前 ONNX/PyTorch 不一致，余弦仅 0.775 的问题）。
#
# 启动（开发环境）：
#   conda activate sk-learn
#   python scripts/embed-server.py
# 默认监听 127.0.0.1:8765。容器内监听 0.0.0.0（EMBED_HOST=0.0.0.0，见 docker/embed-svc.Dockerfile）。
#
# 代理（两套配置）：
#   - 生产/Docker：模型已 scp 到 /models，use_local 走本地，不联网，绝不走代理。
#   - 开发：日常运行模型已在 models/bge-m3/ 也不联网；仅下载/更新模型时连 HF 可能需代理，
#     设 EMBED_PROXY=http://127.0.0.1:7890（.env.local 或启动环境），不设即不走代理。
#
# 端点：
#   GET  /health              → {"status":"ok"}
#   POST /embed   {text}      → {"embedding":[1024 floats]}
#   POST /embed-batch {texts} → {"embeddings":[[1024],...]}

import asyncio
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

# 代理：仅当显式设 EMBED_PROXY 时配置（开发下载模型用；生产/Docker 不设即不走代理）。
# 用 setdefault 不覆盖已存在的 HTTPS_PROXY/HTTP_PROXY。
_embed_proxy = os.environ.get("EMBED_PROXY")
if _embed_proxy:
    os.environ.setdefault("HTTPS_PROXY", _embed_proxy)
    os.environ.setdefault("HTTP_PROXY", _embed_proxy)

from fastapi import FastAPI
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parent.parent
MODEL_DIR = os.environ.get("BGE_MODEL_PATH", str(ROOT / "models" / "bge-m3"))
BATCH_INNER = 12  # GPU 一次 encode 的条数（防 OOM，5070Ti 12G 够）

_SEM = asyncio.Semaphore(3)  # 4核同时最多3个 embed，第4个排队等（防打爆 CPU）
_model = None  # 全局模型，启动加载一次


def _load_model():
    """加载 BGE-M3（fp16 GPU / fp32 CPU，本地目录优先）。"""
    import torch
    from FlagEmbedding import BGEM3FlagModel

    use_local = Path(MODEL_DIR, "pytorch_model.bin").exists()
    src = MODEL_DIR if use_local else "BAAI/bge-m3"
    print(f"[embed-server] 模型来源: {'本地 ' + src if use_local else 'hub(需下载)'}")
    use_fp16 = torch.cuda.is_available()
    print(f"[embed-server] device: {'cuda(fp16)' if use_fp16 else 'cpu'}")
    model = BGEM3FlagModel(src, use_fp16=use_fp16)
    print("[embed-server] 模型加载完成")
    return model


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _model
    print("[embed-server] 启动中，加载模型（首次约 20s）...")
    _model = _load_model()
    yield
    print("[embed-server] 关闭")


app = FastAPI(title="BGE-M3 Embedding", lifespan=lifespan)


class EmbedReq(BaseModel):
    text: str


class EmbedBatchReq(BaseModel):
    texts: list[str]


def _encode(texts: list[str]) -> list[list[float]]:
    """内部分批 encode，返回 list of 1024-dim float list。同步 CPU 密集，由端点丢线程池。"""
    out = []
    for i in range(0, len(texts), BATCH_INNER):
        chunk = texts[i : i + BATCH_INNER]
        vecs = _model.encode(chunk, batch_size=len(chunk), max_length=8192)["dense_vecs"]
        for v in vecs:
            out.append([float(x) for x in v])
    return out


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/embed")
async def embed(req: EmbedReq):
    async with _SEM:
        vec = await asyncio.to_thread(_encode, [req.text])
    return {"embedding": vec[0]}


@app.post("/embed-batch")
async def embed_batch(req: EmbedBatchReq):
    async with _SEM:
        vecs = await asyncio.to_thread(_encode, req.texts)
    return {"embeddings": vecs}


if __name__ == "__main__":
    import uvicorn

    host = os.environ.get("EMBED_HOST", "127.0.0.1")
    port = int(os.environ.get("EMBED_PORT", "8765"))
    print(f"[embed-server] uvicorn {host}:{port}")
    uvicorn.run(app, host=host, port=port)
