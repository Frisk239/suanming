# docker/embed-svc.Dockerfile
# BGE-M3 embedding 微服务。模型不进镜像，运行时 volume 挂载 /models。
FROM python:3.11-slim
WORKDIR /app

COPY scripts/requirements-embed.txt .
RUN pip install --no-cache-dir -r requirements-embed.txt
# CPU 版 torch（服务器无 GPU，体积小无 CUDA）
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

COPY scripts/embed-server.py .
VOLUME ["/models"]
ENV BGE_MODEL_PATH=/models/bge-m3
ENV EMBED_HOST=0.0.0.0
EXPOSE 8765
CMD ["python", "embed-server.py"]
