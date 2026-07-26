# ============================================================
# SmartGrade Backend - Dockerfile
# 微信云托管部署用（从仓库根目录构建）
# ============================================================

# ---- 构建阶段 ----
FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@10

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY shared ./shared
COPY backend ./backend

RUN pnpm install --frozen-lockfile
RUN pnpm --filter backend prisma:generate
RUN pnpm --filter backend build

# ---- 运行阶段 ----
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN npm install -g pnpm@10

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY shared ./shared
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/backend/package.json ./backend/package.json

RUN pnpm install --frozen-lockfile --prod
RUN pnpm --filter backend prisma:generate

EXPOSE 3000

CMD ["pnpm", "--filter", "backend", "start:prod"]
