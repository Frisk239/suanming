# docker/next-app.Dockerfile
# Next.js standalone 多阶段构建。镜像小（只含 standalone 产物 + static + public）。
#
# build-time env（构建时内联，必须 build 阶段有值）：
#   NEXT_PUBLIC_* 是前端可见的公开值（anon key），build 阶段注入无安全顾虑。
#   服务端密钥（SERVICE_ROLE_KEY/DEEPSEEK_API_KEY 等）运行时由 compose env_file 注入，不进 build。
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# 装全依赖（含 dev）供 builder 使用（next build 需 @tailwindcss/postcss/typescript 等）
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
# build-time 公开 env（构建时内联进产物；非机密，anon key 本就前端可见）
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
