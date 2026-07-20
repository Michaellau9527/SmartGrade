/**
 * StudentStatusService — 学生状态服务
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.3 §2.5
 *
 * 职责：
 * 1. 班主任工作台 —— 加载本班学生 + 应用 Resolver 判断
 * 2. 查寝应到学生 —— 自动过滤走读生 + 离校学生
 * 3. 双维度查询 —— 复用 StudentRepository.findByStatusAndLocation
 *
 * ⚠️ v1.3 强制规范：
 * - 本 Service **只读** Student.current_status / current_location
 * - 本 Service **不**提供 setCurrentStatus / setCurrentLocation 方法
 * - 状态变更必须通过 TimelineService.createEvent()
 */

import type { Student, StudentStatus, StudentLocation, BoardingType } from '@smartgrade/shared/types/domain';
import { StudentStatusLocationResolver as ReadResolver } from '@smartgrade/shared/types/domain';
import { studentRepository } from '../repositories/student.repository';
import { teacherRepository } from '../repositories/teacher.repository';

export interface WorkbenchStudentView extends Student {
  /** 派生：是否实际在校 */
  actuallyInSchool: boolean;
  /** 派生：是否异常 */
  abnormal: boolean;
  /** 派生：是否住宿生 */
  isBoarding: boolean;
  /** 派生：状态显示文本 */
  statusText: string;
  /** 派生：位置显示文本 */
  locationText: string;
}

/**
 * 班主任工作台 —— 一站式视图
 */
export class StudentStatusService {
  /**
   * 加载班主任所带班级的学生工作台视图
   *
   * 测试 2 关键路径：teacher_id → teacher_class_relation → students
   *
   * @param teacherId 教师 ID
   * @param options.classId 限定班级（不传则取该教师所有当前关系班）
   */
  async getWorkbenchByTeacher(teacherId: string, options: {
    classId?: string;
    includeOutOfSchool?: boolean;
  } = {}): Promise<{
    classId: string;
    className: string;
    gradeId: string;
    students: WorkbenchStudentView[];
    stats: {
      total: number;
      actuallyInSchool: number;
      outOfSchool: number;
      abnormal: number;
      boardingShouldCheckIn: number;
    };
  }[]> {
    // 1. 拉取教师当前所有有效关系
    const relations = await teacherRepository.findCurrentRelations(teacherId);
    const targetClassIds = options.classId
      ? [options.classId]
      : relations.map((r) => r.classId);

    if (targetClassIds.length === 0) return [];

    // 2. 按班级加载学生
    const results: Awaited<ReturnType<StudentStatusService['getWorkbenchByTeacher']>> = [];

    for (const relation of relations) {
      if (!targetClassIds.includes(relation.classId)) continue;

      const students = await studentRepository.findByClass(relation.classId, {
        currentStatus: options.includeOutOfSchool ? undefined : 'ON_CAMPUS',
      });

      // 3. 应用 Resolver 派生视图
      const views = students.map<WorkbenchStudentView>((s) => this.toWorkbenchView(s));

      // 4. 统计
      const stats = {
        total: views.length,
        actuallyInSchool: views.filter((v) => v.actuallyInSchool).length,
        outOfSchool: views.filter((v) => v.current_status === ('OUT_OF_SCHOOL' as StudentStatus)).length,
        abnormal: views.filter((v) => v.abnormal).length,
        boardingShouldCheckIn: views.filter((v) =>
          ReadResolver.shouldCheckInDorm(this.toDomainStudent({
            currentStatus: v.current_status,
            currentLocation: v.current_location,
            boardingType: v.boarding_type,
          }))
        ).length,
      };

      results.push({
        classId: relation.classId,
        className: relation.class?.name ?? '',
        gradeId: relation.class?.gradeId ?? '',
        students: views,
        stats,
      });
    }

    return results;
  }

  /**
   * 宿管查寝 —— 拉取某栋楼应到学生
   *
   * @param classId 班级 ID（可指定多个）
   */
  async getDormShouldCheckIn(classId: string): Promise<WorkbenchStudentView[]> {
    const students = await studentRepository.findByClass(classId, {
      currentStatus: 'ON_CAMPUS',
    });

    return students
      .filter((s) => ReadResolver.shouldCheckInDorm(this.toDomainStudent({
        currentStatus: s.currentStatus,
        currentLocation: s.currentLocation,
        boardingType: s.boardingType,
      })))
      .map((s) => this.toWorkbenchView(s));
  }

  /**
   * 双维度查询（独立查询，不涉及 Resolver）
   */
  async findByStatusAndLocation(options: {
    schoolId: string;
    gradeId?: string;
    classId?: string;
    currentStatus?: StudentStatus;
    currentLocation?: StudentLocation;
    boardingType?: BoardingType;
  }): Promise<Awaited<ReturnType<typeof studentRepository.findByStatusAndLocation>>> {
    return studentRepository.findByStatusAndLocation(options);
  }

  /**
   * 内部：将 Prisma Student 转为 工作台视图（含派生字段）
   */
  private toWorkbenchView(prismaStudent: Awaited<ReturnType<typeof studentRepository.findByClass>>[number]): WorkbenchStudentView {
    const domain = this.toDomainStudent(prismaStudent);
    return {
      ...(prismaStudent as unknown as Student),
      actuallyInSchool: ReadResolver.isActuallyInSchool(domain),
      abnormal: ReadResolver.isAbnormal(domain),
      isBoarding: ReadResolver.isBoardingStudent(domain),
      statusText: this.statusText(prismaStudent.currentStatus),
      locationText: this.locationText(prismaStudent.currentLocation),
    };
  }

  /**
   * 内部：Prisma Student → Domain Student（用于 Resolver）
   */
  private toDomainStudent(s: { currentStatus: string; currentLocation: string; boardingType: string }): Student {
    return {
      id: '',
      student_no: '',
      name: '',
      gender: 'OTHER',
      class_id: '',
      grade_id: '',
      school_id: '',
      boarding_type: s.boardingType as BoardingType,
      current_status: s.currentStatus as StudentStatus,
      current_location: s.currentLocation as StudentLocation,
      parent_ids: [],
      enrolled_at: '',
      status_updated_at: '',
      created_at: '',
      updated_at: '',
    };
  }

  private statusText(s: string): string {
    return { ON_CAMPUS: '在校', OUT_OF_SCHOOL: '离校', GRADUATED: '已毕业', TRANSFERRED: '已转学' }[s] ?? s;
  }

  private locationText(l: string): string {
    return { CLASSROOM: '教室', DORM: '宿舍', PLAYGROUND: '操场', GATE: '校门', OFF_CAMPUS: '校外', UNKNOWN: '未知' }[l] ?? l;
  }
}

export const studentStatusService = new StudentStatusService();
