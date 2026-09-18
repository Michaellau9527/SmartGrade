# ============================================================
# SmartGrade Backend - Dockerfile
# 微信云托管部署用（从仓库根目录构建）
#
# 启动流程（可通过环境变量控制）：
#   1. prisma migrate deploy              执行生产环境数据库迁移
#        若 _prisma_migrations 表不存在（首次部署）会自动创建
#   2. seed bootstrap (仅首次或显式开启)
#        - SMARTGRADE_RUN_SEED=true       每次启动都跑 SEED_MODE=bootstrap
#        - SMARTGRADE_SEED_ONCE=true      仅当数据库中还没有 User 时跑一次
#        默认都不设置，则跳过 seed（最安全）
#        seed 会创建默认管理员 admin / SmartGrade@2025
#          （可用 SMARTGRADE_ADMIN_USERNAME / SMARTGRADE_ADMIN_PASSWORD 覆盖）
#   3. node dist/main                    启动 NestJS 服务
#
# 默认：migrate 失败不 crash，seed 失败也不 crash，便于排查
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

# 启动入口
CMD ["sh", "-c", "\
  cd /app/backend && \
  echo '[smartgrade] Step 1/3: prisma migrate deploy...' && \
  (pnpm exec prisma migrate deploy || echo '[smartgrade] migrate deploy failed, continuing') && \
  echo '[smartgrade] Step 2/3: seed (if enabled)...' && \
  ( \
    if [ \"$SMARTGRADE_RUN_SEED\" = \"true\" ]; then \
      echo '[smartgrade] SMARTGRADE_RUN_SEED=true -> run seed now'; \
      pnpm --filter backend exec ts-node --transpile-only prisma/seed.ts || echo '[smartgrade] seed failed, continuing'; \
    elif [ \"$SMARTGRADE_SEED_ONCE\" = \"true\" ]; then \
      EXISTS=$(MYSQL_PWD=\"$DATABASE_PASSWORD\" mysql -h \"${DATABASE_HOST:-localhost}\" -u \"${DATABASE_USER:-root}\" \"${DATABASE_NAME:-smartgrade}\" -N -s -e \"SELECT COUNT(*) FROM user LIMIT 1\" 2>/dev/null || echo 0); \
      if [ \"$EXISTS\" = \"0\" ] || [ -z \"$EXISTS\" ]; then \
        echo '[smartgrade] SMARTGRADE_SEED_ONCE=true && user table empty -> run seed'; \
        pnpm --filter backend exec ts-node --transpile-only prisma/seed.ts || echo '[smartgrade] seed failed, continuing'; \
      else \
        echo '[smartgrade] SMARTGRADE_SEED_ONCE=true but user table not empty -> skip seed'; \
      fi; \
    else \
      echo '[smartgrade] seed not enabled (set SMARTGRADE_RUN_SEED or SMARTGRADE_SEED_ONCE to enable) -> skip'; \
    fi \
  ) && \
  echo '[smartgrade] Step 3/3: Starting NestJS...' && \
  pnpm start:prod \
"]
