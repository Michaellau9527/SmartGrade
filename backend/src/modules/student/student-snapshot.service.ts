import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma';

/**
 * StudentSnapshotService - 学生快照服务
 *
 * 用于在发起请假时捕获学生当前信息的快照。
 * 快照数据写入 LeaveRecord 的冗余字段，确保历史记录不受后续学生信息变更影响。
 *
 * docs/08-Database.md DB-011 LeaveRecord 字段说明：
 *   student_name   - 冗余字段，来自 Student.name
 *   class_id       - 冗余字段，来自 Student.class_id
 *   class_name     - 冗余字段，来自 Class.class_name
 *   boarding_type  - 冗余字段，来自 Student.boarding_type
 *   dorm_room_id   - 冗余字段，来自 Student.dorm_room_id
 *   bed_no         - 冗余字段，来自 Student.bed_no
 *
 * docs/07-BusinessFlow.md 第二章前置条件：
 *   学生状态必须为 IN_SCHOOL
 *   学生不能存在未完成请假
 */

/**
 * 学生快照数据结构
 *
 * 直接映射 LeaveRecord 的冗余字段
 */
export interface StudentSnapshot {
  /** 学生ID */
  student_id: bigint;
  /** 学生姓名（冗余到 LeaveRecord.student_name） */
  student_name: string;
  /** 班级ID（冗余到 LeaveRecord.class_id） */
  class_id: bigint;
  /** 班级名称（冗余到 LeaveRecord.class_name） */
  class_name: string;
  /** 住宿类型（冗余到 LeaveRecord.boarding_type） */
  boarding_type: string;
  /** 宿舍房间ID（冗余到 LeaveRecord.dorm_room_id） */
  dorm_room_id: bigint | null;
  /** 床位号（冗余到 LeaveRecord.bed_no） */
  bed_no: string | null;
}

/**
 * 快照验证结果
 */
export interface SnapshotValidationResult {
  /** 是否通过验证 */
  valid: boolean;
  /** 失败原因 */
  reason?: string;
}

@Injectable()
export class StudentSnapshotService {
  private readonly logger = new Logger('StudentSnapshotService');

  constructor(private prisma: PrismaService) {}

  /**
   * 捕获学生快照
   *
   * 查询学生当前信息，包含班级名称和住宿信息。
   * 用于 LeaveRecord 创建时填充冗余字段。
   *
   * @param studentId 学生ID
   * @returns 学生快照数据
   * @throws NotFoundException 学生不存在
   */
  async capture(studentId: number | bigint): Promise<StudentSnapshot> {
    const student = await this.prisma.student.findUnique({
      where: { id: BigInt(studentId), deleted_at: null },
      include: {
        class: {
          select: { id: true, class_name: true },
        },
      },
    });

    if (!student) {
      throw new NotFoundException(`学生不存在 (ID: ${studentId})`);
    }

    this.logger.debug(
      `捕获学生快照: ${student.student_no} ${student.name}, ` +
        `班级: ${student.class.class_name}, 住宿: ${student.boarding_type}`,
    );

    return {
      student_id: student.id,
      student_name: student.name,
      class_id: student.class_id,
      class_name: student.class.class_name,
      boarding_type: student.boarding_type,
      dorm_room_id: student.dorm_room_id,
      bed_no: student.bed_no,
    };
  }

  /**
   * 验证学生是否可以发起请假
   *
   * docs/07-BusinessFlow.md 第二章前置条件：
   * 1. 学生状态必须为 IN_SCHOOL（在校）
   * 2. 学生不能存在未完成请假（PENDING / APPROVED / LEFT）
   *
   * @param studentId 学生ID
   * @returns 验证结果
   */
  async validateForLeave(studentId: number | bigint): Promise<SnapshotValidationResult> {
    const student = await this.prisma.student.findUnique({
      where: { id: BigInt(studentId), deleted_at: null },
      select: { id: true, name: true, status: true },
    });

    if (!student) {
      return { valid: false, reason: '学生不存在' };
    }

    // 检查学生状态
    if (student.status !== 'IN_SCHOOL') {
      return {
        valid: false,
        reason: `学生当前状态为 ${student.status}，仅在校学生可发起请假`,
      };
    }

    // 检查是否存在未完成请假
    const activeLeave = await this.prisma.leaveRecord.findFirst({
      where: {
        student_id: BigInt(studentId),
        status: { in: ['PENDING', 'APPROVED', 'LEFT'] },
        deleted_at: null,
      },
      select: { id: true, leave_no: true, status: true },
    });

    if (activeLeave) {
      return {
        valid: false,
        reason: `学生存在未完成请假 (单号: ${activeLeave.leave_no}, 状态: ${activeLeave.status})`,
      };
    }

    return { valid: true };
  }

  /**
   * 捕获快照并验证请假前置条件
   *
   * 组合方法：先验证，通过后返回快照。
   * 供 Leave 模块调用，简化调用方逻辑。
   *
   * @param studentId 学生ID
   * @returns 学生快照数据
   * @throws NotFoundException 学生不存在
   * @throws BadRequestException 不满足请假前置条件
   */
  async captureForLeave(studentId: number | bigint): Promise<StudentSnapshot> {
    const validation = await this.validateForLeave(studentId);

    if (!validation.valid) {
      throw new BadRequestException(validation.reason);
    }

    return this.capture(studentId);
  }
}
