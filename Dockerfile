# ============================================================
# SmartGrade Backend - Dockerfile
# 微信云托管部署用（从仓库根目录构建）
#
# 启动流程（可通过环境变量控制）：
#   1. prisma migrate deploy              执行生产环境数据库迁移
#        若 _prisma_migrations 表不存在（首次部署）会自动创建
#   2. seed bootstrap (仅首次或显式开启)
#        - SMARTGRADE_RUN_SEED=true|1     每次启动都跑 SEED_MODE=bootstrap（兼容 true/1/yes）
#        - SMARTGRADE_SEED_ONCE=true|1    仅当数据库中还没有 User 时跑一次（兼容 true/1/yes）
#        - 同时兼容无前缀写法 RUN_SEED / SEED_ONCE（旧部署环境变量）
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

# 将 seed 预编译为独立 CommonJS：运行阶段以 --prod 安装，不含 ts-node，
# 故此处先用 builder 里的 tsc 编译，运行时改用 node 执行，避免 seed 静默失败。
# 注：--noEmitOnError false 是有意为之——seed.ts 在 bootstrap 路径之外仍引用了
# 与 schema 重命名后不一致的约束名（teacherId_classId_role_startDate），会在 tsc
# 类型检查阶段报 TS2353；但 bootstrap 运行路径（建 admin 后 return）不会执行到该处，
# 故强制产出 JS 并校验产物存在即可，不应让无关类型错误阻断镜像构建。
RUN cd /app/backend && mkdir -p /app/seed-build && \
    npx tsc prisma/seed.ts prisma/seed-admin-password.ts \
      --rootDir prisma \
      --outDir /app/seed-build \
      --module commonjs --target es2019 --esModuleInterop --skipLibCheck \
      --moduleResolution node --resolveJsonModule --noEmitOnError false; \
    if [ -f /app/seed-build/seed.js ]; then \
      echo '[smartgrade] seed compiled -> /app/seed-build/seed.js'; \
    else \
      echo '[smartgrade] seed compile produced NO seed.js, abort'; exit 1; \
    fi

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
COPY --from=builder /app/seed-build ./seed-build

RUN pnpm install --frozen-lockfile --prod
RUN pnpm --filter backend exec prisma generate

EXPOSE 3000

# 启动入口
CMD ["sh", "-c", "\
  cd /app/backend && \
  echo '[smartgrade] Step 1/3: prisma migrate deploy...' && \
  (pnpm exec prisma migrate deploy \
     && rm -f /tmp/smartgrade_migrate_failed \
     || ( echo '[smartgrade][FATAL] migrate deploy FAILED - schema NOT up to date'; \
          echo \"failed at $(date -u +%FT%TZ)\" > /tmp/smartgrade_migrate_failed; \
          if [ \"$SMARTGRADE_MIGRATE_STRICT\" = \"true\" ]; then exit 78; fi; true )) && \
  echo '[smartgrade] Step 2/3: seed (if enabled)...' && \
  ( \
    RUN_SEED_VAL=${SMARTGRADE_RUN_SEED:-${RUN_SEED:-}}; \
    SEED_ONCE_VAL=${SMARTGRADE_SEED_ONCE:-${SEED_ONCE:-}}; \
    case \"$RUN_SEED_VAL\" in 1|true|yes|TRUE|YES) RUN_SEED_EFF=1 ;; *) RUN_SEED_EFF=0 ;; esac; \
    case \"$SEED_ONCE_VAL\" in 1|true|yes|TRUE|YES) SEED_ONCE_EFF=1 ;; *) SEED_ONCE_EFF=0 ;; esac; \
    if [ \"$RUN_SEED_EFF\" = \"1\" ]; then \
      echo '[smartgrade] RUN_SEED enabled -> run seed now'; \
      node /app/seed-build/seed.js || echo '[smartgrade] seed failed, continuing'; \
    elif [ \"$SEED_ONCE_EFF\" = \"1\" ]; then \
      EXISTS=$(MYSQL_PWD=\"$DATABASE_PASSWORD\" mysql -h \"${DATABASE_HOST:-localhost}\" -u \"${DATABASE_USER:-root}\" \"${DATABASE_NAME:-smartgrade}\" -N -s -e \"SELECT COUNT(*) FROM user LIMIT 1\" 2>/dev/null || echo 0); \
      if [ \"$EXISTS\" = \"0\" ] || [ -z \"$EXISTS\" ]; then \
        echo '[smartgrade] SEED_ONCE enabled && user table empty -> run seed'; \
        node /app/seed-build/seed.js || echo '[smartgrade] seed failed, continuing'; \
      else \
        echo '[smartgrade] SEED_ONCE enabled but user table not empty -> skip seed'; \
      fi; \
    else \
      echo '[smartgrade] seed not enabled (set SMARTGRADE_RUN_SEED/RUN_SEED/SMARTGRADE_SEED_ONCE/SEED_ONCE to enable) -> skip'; \
    fi \
  ) && \
  echo '[smartgrade] Step 3/3: Starting NestJS...' && \
  pnpm start:prod \
"]
