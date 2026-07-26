import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma';
import { StudentStatus } from '@prisma/client';

/**
 * StudentSnapshotService - 学生快照服务
 *
 * 用于在发起请假时捕获学生当前信息的快照。
 * 快照数据写入 LeaveRecord 的冗余字段，确保历史记录不受后续学生信息变更影响。
 *
 * docs/08-Database.md DB-011 LeaveRecord 字段说明：
 *   studentName   - 冗余字段，来自 Student.name
 *   classId       - 冗余字段，来自 Student.classId
 *   className     - 冗余字段，来自 Class.name
 *   boardingType  - 冗余字段，来自 Student.boardingType
 *   dormId        - 冗余字段，来自 Student.dormId
 *   bedNo         - 冗余字段，来自 Student.bedNo
 *
 * docs/07-BusinessFlow.md 第二章前置条件：
 *   学生状态必须为 ON_CAMPUS
 *   学生不能存在未完成请假
 */

/**
 * 学生快照数据结构
 *
 * 直接映射 LeaveRecord 的冗余字段
 */
export interface StudentSnapshot {
  /** 学生ID */
  studentId: string;
  /** 学生姓名（冗余到 LeaveRecord.studentName） */
  studentName: string;
  /** 班级ID（冗余到 LeaveRecord.classId） */
  classId: string;
  /** 班级名称（冗余到 LeaveRecord.className） */
  className: string;
  /** 住宿类型（冗余到 LeaveRecord.boardingType） */
  boardingType: string;
  /** 宿舍房间ID（冗余到 LeaveRecord.dormId） */
  dormId: string | null;
  /** 床位号（冗余到 LeaveRecord.bedNo） */
  bedNo: string | null;
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
  async capture(studentId: string | number): Promise<StudentSnapshot> {
    const student = await this.prisma.student.findUnique({
      where: { id: String(studentId), deletedAt: null },
      include: {
        class: {
          select: { id: true, name: true },
        },
      },
    });

    if (!student) {
      throw new NotFoundException(`学生不存在 (ID: ${studentId})`);
    }

    this.logger.debug(
      `捕获学生快照: ${student.studentNo} ${student.name}, ` +
        `班级: ${student.class.name}, 住宿: ${student.boardingType}`,
    );

    return {
      studentId: student.id,
      studentName: student.name,
      classId: student.classId,
      className: student.class.name,
      boardingType: student.boardingType,
      dormId: student.dormId,
      bedNo: student.bedNo,
    };
  }

  /**
   * 验证学生是否可以发起请假
   *
   * docs/07-BusinessFlow.md 第二章前置条件：
   * 1. 学生状态必须为 ON_CAMPUS（在校）
   * 2. 学生不能存在未完成请假（PENDING / APPROVED / LEFT）
   *
   * @param studentId 学生ID
   * @returns 验证结果
   */
  async validateForLeave(studentId: string | number): Promise<SnapshotValidationResult> {
    const student = await this.prisma.student.findUnique({
      where: { id: String(studentId), deletedAt: null },
      select: { id: true, name: true, currentStatus: true },
    });

    if (!student) {
      return { valid: false, reason: '学生不存在' };
    }

    // 检查学生状态
    if (student.currentStatus !== 'ON_CAMPUS') {
      return {
        valid: false,
        reason: `学生当前状态为 ${student.currentStatus}，仅在校学生可发起请假`,
      };
    }

    // 检查是否存在未完成请假
    const activeLeave = await this.prisma.leaveRecord.findFirst({
      where: {
        studentId: String(studentId),
        status: { in: ['PENDING', 'APPROVED', 'LEFT'] },
        deletedAt: null,
      },
      select: { id: true, leaveNo: true, status: true },
    });

    if (activeLeave) {
      return {
        valid: false,
        reason: `学生存在未完成请假 (单号: ${activeLeave.leaveNo}, 状态: ${activeLeave.status})`,
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
  async captureForLeave(studentId: string | number): Promise<StudentSnapshot> {
    const validation = await this.validateForLeave(studentId);

    if (!validation.valid) {
      throw new BadRequestException(validation.reason);
    }

    return this.capture(studentId);
  }
}
