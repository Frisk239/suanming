# docker/next-app.Dockerfile
# Next.js standalone 多阶段构建。镜像小（只含 standalone 产物 + static + public）。
# 注意：next build 需要 devDependencies（@tailwindcss/postcss / typescript / @types），
# 故 builder 阶段装全依赖；最终 runner 只 COPY standalone 产物（不含 node_modules）。
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# 装全依赖（含 dev）供 builder 使用
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
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
