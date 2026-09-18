/**
 * NoticeRepository — 通知仓储（C03 Skeleton）
 *
 * 上游规则：Sprint 2.2 C03 — 刘老师拍板
 *
 * Skeleton 阶段：所有方法抛出 TODO，不接 Prisma。
 */

export class NoticeRepository {
  findById(_id: string): never {
    throw new Error('TODO');
  }

  findAll(): never {
    throw new Error('TODO');
  }

  create(_data: unknown): never {
    throw new Error('TODO');
  }

  update(_id: string, _data: unknown): never {
    throw new Error('TODO');
  }

  publish(_id: string): never {
    throw new Error('TODO');
  }

  markRead(_id: string, _readerId: string): never {
    throw new Error('TODO');
  }

  markAcknowledged(_id: string, _readerId: string): never {
    throw new Error('TODO');
  }

  archive(_id: string): never {
    throw new Error('TODO');
  }
}
