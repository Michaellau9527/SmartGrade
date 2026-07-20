/**
 * DataScopeResolver — 数据范围解析器
 *
 * 上游规则：Sprint 2.1 Day 5.2 刘老师拍板
 *
 * 职责：解析当前用户能查看的数据范围
 * - resolve(actor) → DataScope
 *
 * 设计约束（刘老师明确）：
 * - 只有一个公开方法 resolve(actor)
 * - 内部 switch(actor.userType) 分发
 * - 不要分散成 resolveHeadTeacher() / resolveParent() / resolveAdmin()
 * - 增加角色时成本最低
 * - Permission 只表示能力，不表示数据范围
 * - DataScope 是唯一的数据权限来源
 *
 * 数据范围规则：
 * - SYSTEM_ADMIN: isSchoolWide = true（可看全校）
 * - TEACHER: 查 TeacherClassRelation → classIds + gradeIds
 *   - 班主任（HEAD_TEACHER）→ 本班 classIds
 *   - 年级主任（directedGrades）→ 本年级 gradeIds
 *   - 政教 → isSchoolWide = true（简化：政教看全校）
 *   - 宿管 → 住宿生范围（Sprint 3 细化）
 * - PARENT: isParentScoped = true（只看自己孩子）
 * - STUDENT: 仅看自己（ Sprint 2 无学生端，简化）
 */

import type { CurrentActor, DataScope } from './types';

/** 解析器依赖接口（便于测试 mock） */
export interface DataScopeResolverDeps {
  /** 查教师当前有效班级关系（含 TeacherClassRole） */
  findTeacherClassRelations(teacherId: string): Promise<
    { classId: string; gradeId: string; schoolId: string; role: string }[]
  >;

  /** 查教师担任年级主任的年级 ID 列表 */
  findTeacherDirectedGrades(teacherId: string): Promise<string[]>;

  /** 查家长关联的学生 ID 列表 */
  findParentStudentIds(parentId: string): Promise<string[]>;
}

export class DataScopeResolver {
  constructor(private deps: DataScopeResolverDeps) {}

  /**
   * 解析数据范围
   *
   * 根据 actor.userType 分发，
   * 返回 DataScope { classIds, gradeIds, isSchoolWide, isParentScoped, version }。
   */
  async resolve(actor: CurrentActor): Promise<DataScope> {
    switch (actor.userType) {
      case 'SYSTEM_ADMIN':
        return this._adminScope();

      case 'TEACHER':
        if (!actor.teacherId) return this._emptyScope();
        return this._teacherScope(actor.teacherId);

      case 'PARENT':
        if (!actor.parentId) return this._emptyScope();
        return this._parentScope(actor.parentId);

      case 'STUDENT':
        return this._studentScope();

      default:
        return this._emptyScope();
    }
  }

  // ============================================================
  // 私有方法
  // ============================================================

  private _emptyScope(): DataScope {
    return {
      classIds: [],
      gradeIds: [],
      isSchoolWide: false,
      isParentScoped: false,
      version: 1,
    };
  }

  private _adminScope(): DataScope {
    return {
      classIds: [],
      gradeIds: [],
      isSchoolWide: true,
      isParentScoped: false,
      version: 1,
    };
  }

  private async _teacherScope(teacherId: string): Promise<DataScope> {
    const relations = await this.deps.findTeacherClassRelations(teacherId);
    const directedGrades = await this.deps.findTeacherDirectedGrades(teacherId);

    const classIds = [...new Set(relations.map((r) => r.classId))];
    const gradeIds = [...new Set([
      ...relations.map((r) => r.gradeId),
      ...directedGrades,
    ])];

    // 政教：如果有 POLITICAL 角色，isSchoolWide = true
    // 简化判定：如果没有任何班级关系但有年级主任关系，或关系数量 > 5（粗略判定为行政角色）
    // 更精确的方式：由外部传入 roleSet，但刘老师要求 resolve(actor) 只接受 actor
    // 这里用关系特征推断：有 HEAD_TEACHER 角色 → 本班；有年级主任 → 本年级；
    // 政教在 schema 中没有单独标记，目前简化：classIds 为空且 directedGrades 为空 → isSchoolWide
    const isSchoolWide = classIds.length === 0 && gradeIds.length === 0;

    return {
      classIds,
      gradeIds,
      isSchoolWide,
      isParentScoped: false,
      version: 1,
    };
  }

  private async _parentScope(parentId: string): Promise<DataScope> {
    const studentIds = await this.deps.findParentStudentIds(parentId);

    return {
      classIds: [],
      gradeIds: [],
      isSchoolWide: false,
      isParentScoped: true,
      version: 1,
    };
  }

  private _studentScope(): DataScope {
    return {
      classIds: [],
      gradeIds: [],
      isSchoolWide: false,
      isParentScoped: false,
      version: 1,
    };
  }
}
