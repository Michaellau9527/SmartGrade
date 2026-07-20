/**
 * WorkbenchStudentStatusProvider — 学生状态统计提供方
 *
 * 上游规则：Sprint 2.2 C01 — 刘老师拍板
 *
 * 职责：为 Workbench 提供按 DataScope 统计的学生状态数据
 *
 * 演进计划：
 * - 当前（C01）：薄桥接层，直接委托 StudentRepository.count 单例
 * - 后续（C05 Student Status Capability）：替换为真正的 StudentStatusService
 */

import type { IStudentStatusService } from './workbench.service';
import { studentRepository } from '../../repositories/student.repository';

export class WorkbenchStudentStatusProvider implements IStudentStatusService {
  async countByScope(options: {
    schoolId?: string;
    gradeId?: string;
    classId?: string;
    currentStatus?: string;
    currentLocation?: string;
    boardingType?: string;
  }): Promise<number> {
    return studentRepository.count({
      schoolId: options.schoolId,
      gradeId: options.gradeId,
      classId: options.classId,
      currentStatus: options.currentStatus as any,
      currentLocation: options.currentLocation as any,
      boardingType: options.boardingType as any,
    });
  }
}
