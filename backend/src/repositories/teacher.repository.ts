/**
 * TeacherRepository — 教师仓储（含 TeacherClassRelation 关联）
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.3 §7 + §8.1.2
 *
 * ⚠️ v1.3 关键：TeacherClassRelation 包含 start_date / end_date
 * - 当前有效关系：endDate IS NULL
 * - 历史关系：endDate IS NOT NULL
 * - 调岗：旧关系 UPDATE endDate = today；新关系 INSERT
 */

import type { Prisma, Teacher, TeacherClassRole } from '@prisma/client';
import { BaseRepository } from './base.repository';

export class TeacherRepository extends BaseRepository {
  // ============================================================
  // Teacher 查询
  // ============================================================

  async findById(id: string, withRelations = false): Promise<Teacher | null> {
    if (withRelations) {
      return this.db.teacher.findUnique({
        where: { id },
        include: {
          teacherRelations: {
            where: { endDate: null },
            include: { class: { include: { grade: true } } },
          },
          headClasses: { include: { grade: true } },
          directedGrades: true,
        },
      });
    }
    return this.db.teacher.findUnique({ where: { id } });
  }

  async findByTeacherNo(teacherNo: string): Promise<Teacher | null> {
    return this.db.teacher.findUnique({ where: { teacherNo } });
  }

  async findByPhone(phone: string): Promise<Teacher | null> {
    return this.db.teacher.findFirst({ where: { phone } });
  }

  // ============================================================
  // Teacher 写入
  // ============================================================

  async create(data: Prisma.TeacherCreateInput): Promise<Teacher> {
    return this.db.teacher.create({ data });
  }

  async update(id: string, data: Prisma.TeacherUpdateInput): Promise<Teacher> {
    return this.db.teacher.update({ where: { id }, data });
  }

  // ============================================================
  // TeacherClassRelation 关键方法（v1.3）
  // ============================================================

  /**
   * 当前有效的班主任列表（endDate IS NULL）
   */
  async findCurrentHeadTeacher(classId: string) {
    return this.db.teacherClassRelation.findFirst({
      where: {
        classId,
        role: 'HEAD_TEACHER',
        endDate: null,
      },
      include: { teacher: true },
    });
  }

  /**
   * 教师当前所有有效关系
   */
  async findCurrentRelations(teacherId: string) {
    return this.db.teacherClassRelation.findMany({
      where: { teacherId, endDate: null },
      include: { class: { include: { grade: true } } },
    });
  }

  /**
   * 教师历史所有关系（含已结束）
   */
  async findAllRelations(teacherId: string) {
    return this.db.teacherClassRelation.findMany({
      where: { teacherId },
      orderBy: { startDate: 'desc' },
      include: { class: { include: { grade: true } } },
    });
  }

  /**
   * 调岗：关闭旧关系，开启新关系
   *
   * ⚠️ v1.3 关键：保留历史（永久留痕 R-014）
   */
  async transferTeacher(params: {
    teacherId: string;
    fromClassId: string;
    toClassId: string;
    role: TeacherClassRole;
    transferDate: Date;
    subject?: string;
  }) {
    const { teacherId, fromClassId, toClassId, role, transferDate, subject } = params;

    return this.db.$transaction(async (tx) => {
      // 1. 关闭旧关系
      await tx.teacherClassRelation.updateMany({
        where: { teacherId, classId: fromClassId, role, endDate: null },
        data: { endDate: transferDate },
      });

      // 2. 创建新关系
      return tx.teacherClassRelation.create({
        data: {
          teacherId,
          classId: toClassId,
          role,
          subject,
          startDate: transferDate,
        },
      });
    });
  }

  /**
   * 创建教师-班级关系（首次分配）
   */
  async assignTeacherToClass(params: {
    teacherId: string;
    classId: string;
    role: TeacherClassRole;
    subject?: string;
    startDate: Date;
  }) {
    return this.db.teacherClassRelation.create({
      data: {
        teacherId: params.teacherId,
        classId: params.classId,
        role: params.role,
        subject: params.subject,
        startDate: params.startDate,
      },
    });
  }

  /**
   * ❌ 禁止：物理删除关系
   * 调岗必须用 transferTeacher，保留历史。
   */
  async deleteRelation(_id: string): Promise<never> {
    throw new Error('[v1.3 R-014] 教师-班级关系不允许物理删除。调岗请用 transferTeacher。');
  }

  /**
   * ❌ 禁止：修改历史 startDate
   */
  async updateRelationStartDate(_id: string, _newDate: Date): Promise<never> {
    throw new Error('[v1.3 R-014] 历史 start_date 不可修改。如需修正，新增一条记录。');
  }
}

export const teacherRepository = new TeacherRepository();
