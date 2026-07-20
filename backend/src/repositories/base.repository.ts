/**
 * 仓储层基类（v1.3 强制规范）
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.3 §8.1.1
 *
 * **关键约束**（业务事件驱动原则）：
 * - ❌ 子类**禁止**暴露 `updateStatus` / `updateLocation` 业务方法
 * - ❌ 子类**禁止**直接接受 `StudentStatus` / `StudentLocation` 作为入参
 * - ✅ 状态变更必须通过 TimelineEvent → Resolver → updateStatusTimestamp 路径
 * - ✅ 子类可暴露 `updateStatusTimestamp`（只更新时间戳，不接受新状态值）
 *
 * Lint 检查通过命名约定：所有 `update*Status*` / `update*Location*` 方法名会被 grep 检测。
 */

import { prisma } from '../db/prisma.client';
import type { Prisma } from '@prisma/client';

/**
 * 事务客户端类型
 *
 * 从 Repository 层导出，CapabilityService 通过此类型引用事务上下文。
 * 实际类型是 Prisma.TransactionClient，但调用方不需要知道这一点。
 */
export type TxClient = Prisma.TransactionClient;

/**
 * Repository 错误：尝试直接更新 Student 状态
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.3 §8.1.1
 *
 * 当代码意外尝试直接修改 Student.current_status 或 current_location 时抛出。
 * 提示开发者走 Timeline → Resolver 路径。
 */
export class DirectStatusUpdateError extends Error {
  constructor(method: string) {
    super(
      `[v1.3] ${method} 禁止直接修改 Student 状态。` +
        '请通过 TimelineService.createEvent() → StudentStatusLocationResolver 触发。' +
        '见 SPRINT2_DOMAIN_RULE_v1.md §8.1.1'
    );
    this.name = 'DirectStatusUpdateError';
  }
}

export abstract class BaseRepository {
  /**
   * ⚠️ 使用 getter 而非 readonly field，原因：
   * 单元测试中需要动态替换 prisma mock 实例；
   * getter 保证每次访问都从 prisma.client 模块拿最新引用。
   */
  protected get db() {
    return prisma;
  }

  /**
   * 在事务中执行多个 Repository 操作
   *
   * 用法：
   * ```ts
   * await leaveRepo.withTransaction(async (tx) => {
   *   await leaveRepo.updateStatus(id, 'APPROVED', tx);
   *   await timelineRepo.create(event, tx);
   * });
   * ```
   *
   * 如果任何一步失败，整个事务回滚（Timeline 强一致保证）。
   */
  async withTransaction<T>(fn: (tx: TxClient) => Promise<T>): Promise<T> {
    return this.db.$transaction(fn);
  }

  /**
   * 通用的"禁止"防护
   *
   * 如果业务代码意外调用了禁止的方法，在这里拦截。
   * ⚠️ 这是一个**设计时**约束，**不**是运行时检查（性能考虑）。
   */
  protected assertNotDirectStatusUpdate(method: string): void {
    if (process.env.NODE_ENV === 'production') return;
    // 仅在开发环境给出警告
    console.warn(
      `[v1.3 WARNING] ${method} 触发。Repository 层禁止直接更新 Student 状态/位置。` +
        '请使用 TimelineService + StudentStatusLocationResolver。'
    );
  }
}
