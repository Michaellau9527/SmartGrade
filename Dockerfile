# ============================================================
# SmartGrade Backend - Dockerfile
# 微信云托管部署用（从仓库根目录构建）
#
# 启动流程：
#   1. prisma migrate deploy  —— 执行生产环境数据库迁移
#        若 _prisma_migrations 表不存在（首次部署）会自动创建
#        失败会打印错误并继续启动，避免容器 crash 导致无法排查
#   2. node dist/main        —— 启动 NestJS 服务
# ============================================================

# ---- 构建阶段 ----
FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@10

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY shared ./shared
COPY backend ./backend

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @smartgrade/shared build
RUN pnpm --filter backend prisma:generate
RUN pnpm --filter backend build

# ---- 运行阶段 ----
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN npm install -g pnpm@10
RUN apk add --no-cache openssl

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY shared ./shared
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/backend/package.json ./backend/package.json

RUN pnpm install --frozen-lockfile --prod
RUN pnpm --filter backend exec prisma generate

EXPOSE 3000

# 启动：先 migrate deploy（生产迁移）再启动 NestJS
CMD ["sh", "-c", "cd /app/backend && echo '[smartgrade] Running prisma migrate deploy...' && (pnpm exec prisma migrate deploy || echo '[smartgrade] prisma migrate deploy failed, continuing startup') && echo '[smartgrade] Starting NestJS...' && pnpm start:prod"]
