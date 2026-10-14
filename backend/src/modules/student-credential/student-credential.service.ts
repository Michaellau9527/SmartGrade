import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { Prisma, StudentCredential } from '@prisma/client';

import { PrismaService } from '@/common/prisma';
import { CurrentUserPayload, DataScope } from '@/common/types';

/** 随机令牌字节数：256-bit 密码学安全随机（设计下限 128-bit） */
const CREDENTIAL_TOKEN_BYTES = 32;

/** 凭证 + 学生关联结果（核验侧使用，学生字段在阶段G做脱敏裁剪） */
export type StudentCredentialWithStudent = Prisma.StudentCredentialGetPayload<{
  include: { student: true };
}>;

/** 凭证状态查询结果（不含 token / tokenHash，仅元数据） */
export interface CredentialStatus {
  studentId: string;
  /** 当前是否存在有效凭证 */
  hasActive: boolean;
  /** 有效凭证元数据（无有效凭证时为 null，且绝不返回令牌哈希） */
  active: {
    id: string;
    version: number;
    issuedBy: string;
    issuedAt: Date;
    lastVerifiedAt: Date | null;
    lastVerifiedBy: string | null;
  } | null;
  /** 历史签发总数（含已撤销） */
  totalIssued: number;
}

/**
 * 学生身份二维码凭证服务（P2-QR 阶段E 基础设施）
 *
 * 安全约束：
 * - 随机令牌只在签发返回值中出现一次，数据库仅存 SHA-256 hex 哈希（token_hash）；
 * - 二维码载荷只含随机令牌，不含姓名/学号/班级等任何个人信息；
 * - 「单学生至多一条有效凭证」不依赖普通索引（MySQL 无部分唯一索引）：
 *   并发安全由 issueCredential 在同一交互式事务内「先对学生父记录 student(id)
 *   加 FOR UPDATE 排他行锁 → 撤销全部旧有效凭证 → 计算新版本 → 创建新凭证」保证；
 *   父记录行锁是同一学生并发签发/补发的唯一串行化点（不同学生互不阻塞）；
 *   @@unique([studentId, version]) 仅作最后兜底（冲突即整体回滚），不作为并发保证手段。
 *
 * HTTP 端点在阶段F（签发/撤销/导出）与阶段G（扫码核验）按权限接入。
 */
@Injectable()
export class StudentCredentialService {
  constructor(private readonly prisma: PrismaService) {}

  /** 生成 256-bit base64url 随机令牌（43 字符，无填充） */
  static generateToken(): string {
    return randomBytes(CREDENTIAL_TOKEN_BYTES).toString('base64url');
  }

  /** SHA-256 hex 哈希（64 字符），与 DB token_hash CHAR(64) 对应 */
  static hashToken(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  /**
   * 签发/补发凭证。
   *
   * 并发正确性（F1-B1 修复）：
   * - 根因：原实现仅靠「UPDATE student_credential SET is_active=0 WHERE student_id=? AND is_active=1」
   *   串行化。当该 UPDATE 命中 0 行（学生尚无有效凭证的首次签发）时**不会取得有效行锁**
   *   （READ COMMITTED 下无间隙锁），两个并发事务因此都算出各自的版本并各自插入，
   *   而 (studentId, version) 唯一约束因两者版本号不同而不触发 → 出现两条 is_active=1。
   *   已在真实 MySQL（InnoDB / READ COMMITTED）上复现。
   * - 修复：事务第一步对父记录 student(id) 做 `SELECT ... FOR UPDATE` 加排他行锁。
   *   同一学生的所有签发请求在该锁上串行化：后到事务在锁释放（前者提交）后才继续，
   *   其后的「撤销旧有效凭证 → 取最大版本 → 创建新凭证」读到的一定是前者已提交的结果，
   *   因此不会再出现双活跃凭证；不同学生命中不同主键行，互不阻塞。
   * - 隔离级别 ReadCommitted 配合锁定读（locking read 始终读最新已提交版本）。
   * - (studentId, version) 唯一约束保留为最后兜底（非唯一保证手段）。
   *
   * 事务边界：锁定读、撤销旧凭证、计算版本、创建新凭证全部在同一交互式事务内完成。
   *
   * @returns credential 数据库记录（仅含哈希）+ token 明文（仅此一次返回，用于生成二维码）
   */
  async issueCredential(
    studentId: string,
    issuedBy: string,
  ): Promise<{ credential: StudentCredential; token: string }> {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, deletedAt: null },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException(`学生不存在或已删除：${studentId}`);
    }

    const token = StudentCredentialService.generateToken();
    const tokenHash = StudentCredentialService.hashToken(token);

    const credential = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // 0) 锁定学生父记录：串行化同一学生的并发签发（不同学生互不阻塞）
        //    锁定读在 ReadCommitted 下始终读取最新已提交数据
        const locked = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM student
          WHERE id = ${studentId} AND deleted_at IS NULL
          FOR UPDATE
        `;
        if (!Array.isArray(locked) || locked.length === 0) {
          throw new NotFoundException(`学生不存在或已删除：${studentId}`);
        }

        // 1) 撤销该学生当前全部有效凭证（补发即旧码立即失效）
        await tx.studentCredential.updateMany({
          where: { studentId, isActive: true },
          data: { isActive: false, revokedAt: new Date(), revokedBy: issuedBy },
        });

        // 2) 计算新版本号（ReadCommitted 下读到已提交的最新最大版本）
        const agg = await tx.studentCredential.aggregate({
          _max: { version: true },
          where: { studentId },
        });
        const version = (agg._max.version ?? 0) + 1;

        // 3) 创建新凭证；并发版本冲突由 (studentId, version) 唯一约束兜底回滚
        return tx.studentCredential.create({
          data: { studentId, tokenHash, version, issuedBy },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );

    return { credential, token };
  }

  /**
   * 撤销学生当前全部有效凭证（单条 UPDATE 原子操作，无需显式事务）。
   * @returns 实际撤销的凭证数量（0 表示该学生本就无有效凭证）
   */
  async revokeCredential(
    studentId: string,
    revokedBy: string,
  ): Promise<{ revokedCount: number }> {
    const result = await this.prisma.studentCredential.updateMany({
      where: { studentId, isActive: true },
      data: { isActive: false, revokedAt: new Date(), revokedBy },
    });
    return { revokedCount: result.count };
  }

  /**
   * 按令牌明文查有效凭证（哈希等值查询）。
   * 核验有效性判定：isActive === true 且 revokedAt 为空；
   * 学生侧有效性（未删除/未毕业/未转学）由阶段G核验接口复核。
   */
  async findActiveByToken(token: string): Promise<StudentCredentialWithStudent | null> {
    if (!token) return null;
    const tokenHash = StudentCredentialService.hashToken(token);
    return this.prisma.studentCredential.findFirst({
      where: { tokenHash, isActive: true, revokedAt: null },
      include: { student: true },
    });
  }

  // ===================================================================
  // 阶段F1：带数据范围校验的对外能力（HTTP 层直接复用，不在 Controller 内重复实现）
  // ===================================================================

  /**
   * 签发/补发（带数据范围校验）。
   *
   * 语义：同一学生再次调用即「补发」——同一事务内作废旧有效凭证并生成新令牌，
   * 旧码立即失效。操作者身份取自已认证上下文，不由请求体指定。
   *
   * @returns credential 元数据 + token 明文（仅此一次返回）
   */
  async issueForUser(
    studentId: string,
    user: CurrentUserPayload,
  ): Promise<{ credential: StudentCredential; token: string }> {
    const student = await this.loadStudentInScope(studentId, user.dataScope);
    // 复用既有签发/补发逻辑（存在性已在 loadStudentInScope 校验）
    return this.issueCredential(student.id, this.actorId(user));
  }

  /**
   * 撤销该学生当前全部有效凭证（带数据范围校验，幂等）。
   *
   * @returns revokedCount 实际撤销数量；0 表示本就无有效凭证（重复撤销不报错、不改状态）
   */
  async revokeForUser(
    studentId: string,
    user: CurrentUserPayload,
  ): Promise<{ studentId: string; revokedCount: number }> {
    const student = await this.loadStudentInScope(studentId, user.dataScope);
    const { revokedCount } = await this.revokeCredential(student.id, this.actorId(user));
    return { studentId: student.id, revokedCount };
  }

  /**
   * 查询凭证状态（带数据范围校验，仅返回元数据，绝不返回 token / tokenHash）。
   */
  async getStatusForUser(
    studentId: string,
    user: CurrentUserPayload,
  ): Promise<CredentialStatus> {
    const student = await this.loadStudentInScope(studentId, user.dataScope);
    return this.getStatus(student.id);
  }

  /**
   * 凭证状态查询（无鉴权语义，仅供内部/已校验场景调用）。
   *
   * select 显式限定字段，确保响应中不含 tokenHash。
   */
  async getStatus(studentId: string): Promise<CredentialStatus> {
    const [active, totalIssued] = await Promise.all([
      this.prisma.studentCredential.findFirst({
        where: { studentId, isActive: true, revokedAt: null },
        select: {
          id: true,
          version: true,
          issuedBy: true,
          issuedAt: true,
          lastVerifiedAt: true,
          lastVerifiedBy: true,
        },
      }),
      this.prisma.studentCredential.count({ where: { studentId } }),
    ]);

    return {
      studentId,
      hasActive: active !== null,
      active: active ?? null,
      totalIssued,
    };
  }

  /**
   * 操作者标识：取自 JWT 上下文（教师 cuid），拒绝任何来自请求体的身份声明。
   */
  private actorId(user: CurrentUserPayload): string {
    const id = user?.id;
    if (id === undefined || id === null || String(id).length === 0) {
      throw new ForbiddenException('无法识别操作者身份');
    }
    return String(id);
  }

  /**
   * 加载学生并做数据范围校验；不存在/已删除 → 404，越权 → 404（避免暴露存在性）。
   */
  private async loadStudentInScope(
    studentId: string,
    dataScope: DataScope,
  ): Promise<{ id: string; classId: string; gradeId: string; boardingType: string }> {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, deletedAt: null },
      select: { id: true, classId: true, gradeId: true, boardingType: true },
    });
    if (!student) {
      throw new NotFoundException('学生不存在或已删除');
    }
    this.assertStudentInScope(student, dataScope);
    return student;
  }

  /**
   * 数据范围校验（与 StudentService.checkDataScopeAccess 语义一致）。
   *
   * deny by default：无数据范围上下文时直接拒绝，不依赖前端隐藏按钮。
   */
  private assertStudentInScope(
    student: { classId: string; gradeId: string; boardingType: string },
    dataScope: DataScope,
  ): void {
    if (!dataScope) {
      throw new ForbiddenException('无权操作该学生（缺少数据范围上下文）');
    }

    switch (dataScope.type) {
      case 'ALL':
        // 管理员 / 政教：全校
        return;

      case 'GRADE':
        // 年级主任：学生必须属于该年级
        if (dataScope.gradeId && student.gradeId !== String(dataScope.gradeId)) {
          throw new NotFoundException('无权操作该学生（非本年级）');
        }
        return;

      case 'CLASS':
        // 班主任：学生必须属于本班
        if (dataScope.classId && student.classId !== String(dataScope.classId)) {
          throw new NotFoundException('无权操作该学生');
        }
        return;

      case 'DORM':
        // 宿管：仅住宿生
        if (student.boardingType !== 'BOARDING') {
          throw new NotFoundException('无权操作该学生（非住宿生）');
        }
        return;

      case 'SELF':
        // 任课教师：预留授课班级扩展；无 classIds 时拒绝
        if (!dataScope.classIds || dataScope.classIds.length === 0) {
          throw new NotFoundException('无权操作该学生（暂无授课班级）');
        }
        return;

      default:
        throw new ForbiddenException('无权操作该学生');
    }
  }
}
