# docker/embed-svc.Dockerfile
# BGE-M3 embedding 微服务。模型不进镜像，运行时 volume 挂载 /models。
#
# 注意 torch 安装顺序：必须先装 CPU 版 torch，再装 FlagEmbedding。
# 否则 FlagEmbedding 依赖解析会从 PyPI 默认拉 GPU 版 torch（带 CUDA/nvidia 包，好几 G，无 GPU 服务器纯浪费且易撑爆磁盘）。
# 先装 CPU torch 后，FlagEmbedding 检测到 torch 已满足，不会重复安装。
FROM python:3.11-slim
WORKDIR /app

# 1. 先装 CPU 版 torch（从 pytorch 官方 CPU 源，无 CUDA，~190MB）
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# 2. 再装其余依赖（FlagEmbedding 发现 torch 已满足，复用 CPU 版，不拉 GPU 包）
COPY scripts/requirements-embed.txt .
RUN pip install --no-cache-dir -r requirements-embed.txt

COPY scripts/embed-server.py .
VOLUME ["/models"]
ENV BGE_MODEL_PATH=/models/bge-m3
ENV EMBED_HOST=0.0.0.0
EXPOSE 8765
CMD ["python", "embed-server.py"]
