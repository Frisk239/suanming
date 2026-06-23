#!/usr/bin/env python
# scripts/gh-embed.py
# GPU 批量 embedding: 读 chunks.json -> BGE-M3(GPU) -> embeddings.json
# 用法: conda run -n sk-learn python scripts/gh-embed.py
#
# 模型: BAAI/bge-m3(PyTorch 原生,与 TS 端 Xenova/bge-m3 ONNX 权重一致,向量空间相同)
# 优势: RTX 5070Ti GPU 推理,比 ONNX CPU 快 20-50 倍(1174条从40min降到1-2min)
#
# 首次会下载 BGE-M3 模型(~2GB,走系统代理或直连 HF)。
# 设置 HF_HUB_OFFLINE=1 可用本地已下载的(若 HF_HOME 有缓存)。

import json
import os
import sys
import time
from pathlib import Path

# 走代理(本机翻墙连 HF),与 .env.local 的 HTTPS_PROXY 一致
proxy = "http://127.0.0.1:7890"
os.environ.setdefault("HTTPS_PROXY", proxy)
os.environ.setdefault("HTTP_PROXY", proxy)

ROOT = Path(__file__).resolve().parent.parent
CHUNKS_PATH = ROOT / "scripts" / "data" / "chunks.json"
OUT_PATH = ROOT / "scripts" / "data" / "embeddings.json"


def main():
    if not CHUNKS_PATH.exists():
        print(f"错误: 找不到 {CHUNKS_PATH}")
        print("请先运行: npx tsx scripts/export-chunks.ts")
        sys.exit(1)

    print("=== 1. 读取切片 ===")
    chunks = json.loads(CHUNKS_PATH.read_text(encoding="utf-8"))
    print(f"  切片数: {len(chunks)}")

    print("=== 2. 加载 BGE-M3 模型(GPU) ===")
    t0 = time.time()

    # 优先用本地模型目录(浏览器手动下载放 D:\code\suanming\models\bge-m3\)
    # 否则回退到从 hub 下载(需代理,大文件易断)
    local_path = os.environ.get(
        "BGE_MODEL_PATH", str(ROOT / "models" / "bge-m3")
    )
    use_local = os.path.exists(os.path.join(local_path, "pytorch_model.bin"))
    model_src = local_path if use_local else "BAAI/bge-m3"
    print(f"  模型来源: {'本地目录 ' + local_path if use_local else 'hub(BAAI/bge-m3, 需下载)'}")

    if not use_local:
        # hub 下载(带进度条)。若本机下载不稳,改用手动下载到 models/bge-m3/。
        from huggingface_hub import snapshot_download

        print("  预下载模型权重(首次 ~2GB,有进度条,耐心等)...")
        snapshot_download("BAAI/bge-m3", max_workers=4, allow_patterns=[
            "pytorch_model.bin", "config.json", "tokenizer.json",
            "sentencepiece.bpe.model", "tokenizer_config.json",
        ])

    from FlagEmbedding import BGEM3FlagModel

    device = "cuda" if _cuda_available() else "cpu"
    print(f"  device: {device}")
    model = BGEM3FlagModel(model_src, use_fp16=(device == "cuda"))
    print(f"  模型加载耗时: {time.time() - t0:.1f}s")

    print("=== 3. 批量 embedding ===")
    t0 = time.time()
    texts = [c["content"] for c in chunks]
    # batch_size 越大越快,GPU 12G 显存可设 12-16
    out = model.encode(texts, batch_size=12, max_length=8192)["dense_vecs"]
    print(f"  embedding 耗时: {time.time() - t0:.1f}s")
    print(f"  向量维度: {len(out[0])}")

    print("=== 4. 写出 embeddings.json ===")
    records = []
    for chunk, vec in zip(chunks, out):
        records.append({**chunk, "embedding": [float(x) for x in vec]})
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(records, ensure_ascii=False), encoding="utf-8")
    size_mb = OUT_PATH.stat().st_size / 1024 / 1024
    print(f"  已写出: {OUT_PATH} ({size_mb:.1f} MB, {len(records)} 条)")
    print("=== 完成。下一步: npx tsx scripts/build-rag.ts load ===")


def _cuda_available() -> bool:
    try:
        import torch

        return torch.cuda.is_available()
    except Exception:
        return False


if __name__ == "__main__":
    main()
