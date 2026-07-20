/**
 * StudentRepository — 学生仓储
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.3 §2.5 + §8.1.1
 *
 * ⚠️ v1.3 强制规范：
 * - ❌ 不暴露 `updateStatus` / `updateLocation` / `setCurrentStatus` / `changeLocation` 业务方法
 * - ❌ 不接受 `StudentStatus` / `StudentLocation` 作为入参
 * - ✅ 状态变更唯一路径：TimelineService.createEvent() → Resolver → updateStatusTimestamp()
 * - ✅ 暴露 `updateStatusTimestamp(studentId, occurredAt)`：仅由 Service 调用
 *
 * Sprint 3 才会实现 StudentStatusLocationResolver 的订阅逻辑；
 * 当前 Repository 仅暴露时间戳更新接口，**预留**调用入口。
 */

import type { Prisma, Student } from '@prisma/client';
import { BaseRepository, DirectStatusUpdateError } from './base.repository';

export interface FindStudentsOptions {
  schoolId?: string;
  gradeId?: string;
  classId?: string;
  currentStatus?: Student['currentStatus'];
  currentLocation?: Student['currentLocation'];
  boardingType?: Student['boardingType'];
  dormId?: string;
  search?: string;
  limit?: number;
  offset?: number;
  includeDeleted?: boolean;
}

export class StudentRepository extends BaseRepository {
  // ============================================================
  // 1. 查询方法（无副作用）
  // ============================================================

  async findById(id: string, includeRelations = false): Promise<Student | null> {
    if (includeRelations) {
      return this.db.student.findUnique({
        where: { id },
        include: {
          class: { include: { grade: true } },
          dorm: { include: { building: true } },
          relations: { include: { parent: true } },
        },
      });
    }
    return this.db.student.findUnique({ where: { id } });
  }

  async findByStudentNo(studentNo: string): Promise<Student | null> {
    return this.db.student.findUnique({ where: { studentNo } });
  }

  async findByClass(classId: string, options: Omit<FindStudentsOptions, 'classId'> = {}): Promise<Student[]> {
    return this.db.student.findMany({
      where: {
        classId,
        deletedAt: options.includeDeleted ? undefined : null,
        ...(options.currentStatus && { currentStatus: options.currentStatus }),
        ...(options.currentLocation && { currentLocation: options.currentLocation }),
        ...(options.boardingType && { boardingType: options.boardingType }),
        ...(options.search && {
          OR: [
            { name: { contains: options.search } },
            { studentNo: { contains: options.search } },
          ],
        }),
      },
      orderBy: [{ name: 'asc' }, { studentNo: 'asc' }],
      take: options.limit ?? 100,
      skip: options.offset ?? 0,
    });
  }

  async findByGrade(gradeId: string, options: Omit<FindStudentsOptions, 'gradeId' | 'classId'> = {}): Promise<Student[]> {
    return this.db.student.findMany({
      where: {
        gradeId,
        deletedAt: options.includeDeleted ? undefined : null,
        ...(options.currentStatus && { currentStatus: options.currentStatus }),
        ...(options.currentLocation && { currentLocation: options.currentLocation }),
        ...(options.boardingType && { boardingType: options.boardingType }),
      },
      orderBy: [{ classId: 'asc' }, { name: 'asc' }],
      take: options.limit ?? 500,
    });
  }

  /**
   * 双维度组合查询（v1.2 关键）
   * 支持您 Day 2 验收的"查高一所有在校学生""查所有宿舍学生"等场景
   */
  async findByStatusAndLocation(options: {
    schoolId: string;
    gradeId?: string;
    classId?: string;
    currentStatus?: Student['currentStatus'];
    currentLocation?: Student['currentLocation'];
    boardingType?: Student['boardingType'];
    limit?: number;
  }): Promise<Student[]> {
    return this.db.student.findMany({
      where: {
        schoolId: options.schoolId,
        ...(options.gradeId && { gradeId: options.gradeId }),
        ...(options.classId && { classId: options.classId }),
        ...(options.currentStatus && { currentStatus: options.currentStatus }),
        ...(options.currentLocation && { currentLocation: options.currentLocation }),
        ...(options.boardingType && { boardingType: options.boardingType }),
        deletedAt: null,
      },
      orderBy: [{ gradeId: 'asc' }, { classId: 'asc' }, { name: 'asc' }],
      take: options.limit ?? 1000,
    });
  }

  async count(options: FindStudentsOptions = {}): Promise<number> {
    return this.db.student.count({
      where: {
        ...(options.schoolId && { schoolId: options.schoolId }),
        ...(options.gradeId && { gradeId: options.gradeId }),
        ...(options.classId && { classId: options.classId }),
        ...(options.currentStatus && { currentStatus: options.currentStatus }),
        ...(options.currentLocation && { currentLocation: options.currentLocation }),
        ...(options.boardingType && { boardingType: options.boardingType }),
        deletedAt: options.includeDeleted ? undefined : null,
      },
    });
  }

  // ============================================================
  // 2. 写入方法
  // ============================================================

  async create(data: Prisma.StudentCreateInput): Promise<Student> {
    return this.db.student.create({ data });
  }

  async update(id: string, data: Prisma.StudentUpdateInput): Promise<Student> {
    return this.db.student.update({ where: { id }, data });
  }

  /**
   * 软删除（永久留痕 R-012）
   */
  async softDelete(id: string): Promise<Student> {
    return this.db.student.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ============================================================
  // 3. v1.3 强制规范：唯一允许的状态变更入口
  // ============================================================

  /**
   * ⚠️ v1.3 关键方法：仅更新时间戳
   *
   * 这是 Repository 层**唯一**暴露的状态相关方法。
   * 调用方：StudentStatusService（通过 Resolver 决定是否调用）
   *
   * 与 `update(id, { currentStatus: ... })` 严格区分：
   * - `update`：通用字段更新（仅供 Service 使用）
   * - `updateStatusTimestamp`：**仅**更新时间戳，不修改 currentStatus / currentLocation
   *
   * 真正的状态值由 Service 在创建 TimelineEvent 时直接 SQL 写入。
   */
  async updateStatusTimestamp(
    studentId: string,
    type: 'STATUS' | 'LOCATION' | 'BOTH',
    occurredAt: Date
  ): Promise<Student> {
    const data: Prisma.StudentUpdateInput = {};
    if (type === 'STATUS' || type === 'BOTH') {
      data.statusUpdatedAt = occurredAt;
    }
    if (type === 'LOCATION' || type === 'BOTH') {
      data.locationUpdatedAt = occurredAt;
    }
    return this.db.student.update({ where: { id: studentId }, data });
  }

  /**
   * ❌ 禁止：直接设置 StudentStatus
   *
   * 抛出 DirectStatusUpdateError，避免业务代码意外直接修改状态。
   * 正确做法：调用 TimelineService.createEvent() → Resolver → updateStatusTimestamp()
   */
  async setCurrentStatus(_studentId: string, _status: Student['currentStatus']): Promise<never> {
    throw new DirectStatusUpdateError('StudentRepository.setCurrentStatus');
  }

  /**
   * ❌ 禁止：直接设置 StudentLocation
   */
  async setCurrentLocation(_studentId: string, _location: Student['currentLocation']): Promise<never> {
    throw new DirectStatusUpdateError('StudentRepository.setCurrentLocation');
  }

  /**
   * ❌ 禁止：直接 update currentStatus
   */
  async updateStatus(_studentId: string, _status: Student['currentStatus']): Promise<never> {
    throw new DirectStatusUpdateError('StudentRepository.updateStatus');
  }

  /**
   * ❌ 禁止：直接 update currentLocation
   */
  async updateLocation(_studentId: string, _location: Student['currentLocation']): Promise<never> {
    throw new DirectStatusUpdateError('StudentRepository.updateLocation');
  }
}

export const studentRepository = new StudentRepository();
