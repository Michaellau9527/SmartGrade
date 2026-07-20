/**
 * StudentStatusLocationResolver — 双维度判断工具
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.2 §2.5.4
 *
 * ⚠️ 这是 v1.2 核心方法集。
 * 所有"判断学生是否在校" / "查寝应到" / "走读生" / "异常学生" 全部走这里。
 *
 * 业务事件 → Resolver → 状态变更（v1.2 §2.5.3 触发矩阵）
 */

import type { Student, BoardingType } from './Student';
import type { StudentStatus } from './enums/StudentStatus';
import type { StudentLocation } from './enums/StudentLocation';
import { IN_CAMPUS_LOCATIONS } from './enums/StudentLocation';

export class StudentStatusLocationResolver {
  /**
   * 判断学生此刻是否"实际在校"
   * - Status 必须是 ON_CAMPUS
   * - Location 必须在校内（CLASSROOM / DORM / PLAYGROUND / GATE）
   */
  static isActuallyInSchool(student: Student): boolean {
    if (student.current_status !== ('ON_CAMPUS' as StudentStatus)) {
      return false;
    }
    return IN_CAMPUS_LOCATIONS.includes(student.current_location);
  }

  /**
   * 查寝应到学生（晚自习后）
   * - Status = ON_CAMPUS
   * - 必须是住宿生
   * - 不在校外
   */
  static shouldCheckInDorm(student: Student): boolean {
    if (student.current_status !== ('ON_CAMPUS' as StudentStatus)) {
      return false;
    }
    if (student.boarding_type !== ('BOARDING' as BoardingType)) {
      return false;
    }
    if (student.current_location === ('OFF_CAMPUS' as StudentLocation)) {
      return false;
    }
    return true;
  }

  /**
   * 是否走读生
   */
  static isDayStudent(student: Student): boolean {
    return student.boarding_type === ('DAY_STUDENT' as BoardingType);
  }

  /**
   * 是否住宿生
   */
  static isBoardingStudent(student: Student): boolean {
    return student.boarding_type === ('BOARDING' as BoardingType);
  }

  /**
   * 是否已离校
   */
  static isOutOfSchool(student: Student): boolean {
    return student.current_status === ('OUT_OF_SCHOOL' as StudentStatus);
  }

  /**
   * 是否在宿舍
   */
  static isInDorm(student: Student): boolean {
    return (
      student.current_status === ('ON_CAMPUS' as StudentStatus) &&
      student.current_location === ('DORM' as StudentLocation)
    );
  }

  /**
   * 是否在教室
   */
  static isInClassroom(student: Student): boolean {
    return (
      student.current_status === ('ON_CAMPUS' as StudentStatus) &&
      student.current_location === ('CLASSROOM' as StudentLocation)
    );
  }

  /**
   * 是否在操场
   */
  static isInPlayground(student: Student): boolean {
    return (
      student.current_status === ('ON_CAMPUS' as StudentStatus) &&
      student.current_location === ('PLAYGROUND' as StudentLocation)
    );
  }

  /**
   * 异常学生筛选（用于班主任工作台）
   * 异常 = 离校 + 位置异常
   */
  static isAbnormal(student: Student): boolean {
    // 状态异常
    if (student.current_status === ('OUT_OF_SCHOOL' as StudentStatus)) {
      return true; // 离校 = 异常（对班主任来说）
    }
    // 位置异常（在校但位置 UNKNOWN）
    if (
      student.current_status === ('ON_CAMPUS' as StudentStatus) &&
      student.current_location === ('UNKNOWN' as StudentLocation)
    ) {
      return true;
    }
    return false;
  }

  /**
   * 批量判断（用于班级列表）
   */
  static filterActuallyInSchool(students: Student[]): Student[] {
    return students.filter((s) => this.isActuallyInSchool(s));
  }

  /**
   * 批量筛选查寝应到
   */
  static filterShouldCheckInDorm(students: Student[]): Student[] {
    return students.filter((s) => this.shouldCheckInDorm(s));
  }
}

/** Mock 用法示例 */
export const RESOLVER_USAGE_EXAMPLE = `
import { StudentStatusLocationResolver } from '@smartgrade/shared/types/domain';

// 班主任工作台加载班级学生
const students = await studentService.findByClass(classId);

// 统计实到人数
const actuallyInSchool = StudentStatusLocationResolver.filterActuallyInSchool(students);
const presentCount = actuallyInSchool.length;

// 异常学生（自动红色高亮）
const abnormalStudents = students.filter(s => StudentStatusLocationResolver.isAbnormal(s));

// 宿管查寝
const dormList = StudentStatusLocationResolver.filterShouldCheckInDorm(students);
`;
