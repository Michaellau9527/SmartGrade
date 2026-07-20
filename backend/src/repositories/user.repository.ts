/**
 * UserRepository — 系统账户仓储
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.2 §7 + Sprint 2.1 Day 4 拍板 4
 *
 * 职责（专管 user 表）：
 * - 查找：findById / findByUsername / findByTeacher / findByParent
 * - 写入：createUser / updateUser / recordLogin
 * - 业务身份解析：拿到 user 即可知道是 Teacher / Parent / Student 中的哪一个
 *
 * 明确**不**管（拍板 4 强制边界）：
 * - ❌ user_identity 表读写（→ IdentityRepository）
 * - ❌ 密码哈希校验（→ AccountLoginStrategy）
 * - ❌ 业务对象（Teacher / Student / Parent）操作（→ 对应业务 Repository）
 *
 * ⚠️ 拍板 4 强制规则：业务 Service（如 LeaveService / NoticeService / TaskService）
 *    **不允许 import 本文件**。业务 Service 如需拿到业务身份，应当：
 *    - TeacherService → TeacherRepository
 *    - ParentService → ParentRepository
 *    - StudentService → StudentRepository
 *
 * 允许依赖 UserRepository 的仅：
 *    - IdentityService / AuthService / SessionService（认证链路）
 */

import type { Prisma, User, UserType } from '@prisma/client';
import { BaseRepository } from './base.repository';

export class UserRepository extends BaseRepository {
  // ============================================================
  // User 查询
  // ============================================================

  async findById(id: string): Promise<User | null> {
    // 注：v1.2 schema 中 User 只通过 teacherId / parentId 关联业务实体
    // Student → User 的关联 v1.2 暂未实现（学生用户端不在 Day 4 范围）
    return this.db.user.findUnique({
      where: { id },
      include: { teacher: true, parent: true },
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { username } });
  }

  async findByTeacher(teacherId: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { teacherId } });
  }

  async findByParent(parentId: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { parentId } });
  }

  async findByStudent(studentId: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { studentId } });
  }

  async findByUserType(userType: UserType): Promise<User[]> {
    return this.db.user.findMany({
      where: { userType, deletedAt: null },
    });
  }

  // ============================================================
  // User 写入
  // ============================================================

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.db.user.create({ data });
  }

  async updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.db.user.update({ where: { id }, data });
  }

  /**
   * 记录登录（更新 lastLoginAt + lastLoginIp）
   *
   * 注：UserIdentity 表的"按 provider 维度的最后登录时间"在 IdentityRepository 中跟踪。
   * 这里只更新 user 维度的"任一方式最后登录时间"。
   */
  async recordLogin(id: string, ip: string): Promise<User> {
    return this.db.user.update({
      where: { id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip },
    });
  }
}

export const userRepository = new UserRepository();
