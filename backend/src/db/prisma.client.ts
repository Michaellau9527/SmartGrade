/**
 * Prisma Client 单例
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.3
 * 数据库：MySQL 8
 *
 * 设计原则：
 * - 整个 backend 进程共享一个 PrismaClient 实例（避免连接池耗尽）
 * - 通过 src/repositories/* 访问，**禁止**直接 import prisma 后做 updateStatus/updateLocation
 * - 所有状态变更必须经 TimelineService → StudentStatusLocationResolver
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
