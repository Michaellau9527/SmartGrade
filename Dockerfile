# ============================================================
# SmartGrade Backend - Dockerfile
# 微信云托管部署用（从仓库根目录构建）
# ============================================================

# ---- 构建阶段 ----
FROM node:20-alpine AS builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm@8

# 复制 monorepo 配置文件
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# 复制 shared 包（backend 的 workspace 依赖）
COPY shared ./shared

# 复制 backend 源码
COPY backend ./backend

# 安装所有依赖（monorepo 模式）
RUN pnpm install --frozen-lockfile

# 生成 Prisma Client
RUN pnpm --filter backend prisma:generate

# 构建 backend
RUN pnpm --filter backend build

# ---- 运行阶段 ----
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# 安装 pnpm（用于 prod 依赖安装）
RUN npm install -g pnpm@8

# 复制 monorepo 配置
COPY package.json pnpm-workspace.yaml ./

# 复制 shared 包源码
COPY shared ./shared

# 从 builder 复制 backend 构建产物
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/backend/package.json ./backend/package.json

# 只安装生产依赖
RUN pnpm install --frozen-lockfile --prod

# 重新生成 Prisma Client（prod 环境下确认版本一致）
RUN pnpm --filter backend prisma:generate

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["pnpm", "--filter", "backend", "start:prod"]
