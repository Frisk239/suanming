#!/usr/bin/env python
# scripts/embed-server.py
# BGE-M3 embedding 微服务（FastAPI + GPU）。
# 统一建库 + 查询的 embedding：同一模型(BAAI/bge-m3) + 同一实现(fp16 GPU)，
# 向量空间完全一致（修复之前 ONNX/PyTorch 不一致，余弦仅 0.775 的问题）。
#
# 启动（开发环境）：
#   conda activate sk-learn
#   python scripts/embed-server.py
# 默认监听 127.0.0.1:8765。
#
# 端点：
#   GET  /health              → {"status":"ok"}
#   POST /embed   {text}      → {"embedding":[1024 floats]}
#   POST /embed-batch {texts} → {"embeddings":[[1024],...]}
#
# 部署（推迟到 M4/M5）：Railway/Fly.io 容器，Vercel interpret 走 HTTP 调它。spec 4.7/6.5。

import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

# 走代理（首次下载模型用；本机翻墙连 HF）。模型已在 models/bge-m3/ 时无需联网
proxy = "http://127.0.0.1:7890"
os.environ.setdefault("HTTPS_PROXY", proxy)
os.environ.setdefault("HTTP_PROXY", proxy)

from fastapi import FastAPI
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parent.parent
MODEL_DIR = os.environ.get("BGE_MODEL_PATH", str(ROOT / "models" / "bge-m3"))
BATCH_INNER = 12  # GPU 一次 encode 的条数（防 OOM，5070Ti 12G 够）

_model = None  # 全局模型，启动加载一次


def _load_model():
    """加载 BGE-M3（fp16 GPU，本地目录优先）。"""
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
    """内部分批 encode，返回 list of 1024-dim float list。"""
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
def embed(req: EmbedReq):
    return {"embedding": _encode([req.text])[0]}


@app.post("/embed-batch")
def embed_batch(req: EmbedBatchReq):
    return {"embeddings": _encode(req.texts)}


if __name__ == "__main__":
    import uvicorn

    host = os.environ.get("EMBED_HOST", "127.0.0.1")
    port = int(os.environ.get("EMBED_PORT", "8765"))
    print(f"[embed-server] uvicorn {host}:{port}")
    uvicorn.run(app, host=host, port=port)
