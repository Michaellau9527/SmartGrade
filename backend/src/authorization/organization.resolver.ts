/**
 * OrganizationResolver — 组织归属解析器
 *
 * 上游规则：Sprint 2.1 Day 5.2 刘老师拍板
 *
 * 职责：解析当前用户属于哪个组织
 * - resolve(actor) → { schoolId, gradeIds, classIds }
 *
 * 设计约束：
 * - 只有一个公开方法 resolve(actor)
 * - 内部 switch(actor.userType) 分发
 * - 只做简单查询：School → Grade → TeacherClassRelation
 * - 不提前考虑 Department / Campus / Building
 *
 * 数据来源：
 * - TEACHER → TeacherClassRelation（当前有效关系，endDate IS NULL）
 * - PARENT → StudentParent → Student → Class → Grade
 * - STUDENT → Student 表直接查 classId / gradeId / schoolId
 * - SYSTEM_ADMIN → 无特定组织归属（返回空）
 */

import type { CurrentActor } from './types';

/** 组织归属 */
export interface Organization {
  /** 学校 ID */
  schoolId: string;

  /** 年级 ID 列表 */
  gradeIds: string[];

  /** 班级 ID 列表 */
  classIds: string[];
}

/** 解析器依赖接口（便于测试 mock） */
export interface OrganizationResolverDeps {
  /** 查教师当前有效班级关系（endDate IS NULL） */
  findTeacherClassRelations(teacherId: string): Promise<
    { classId: string; gradeId: string; schoolId: string }[]
  >;

  /** 查家长关联的孩子及其组织 */
  findParentChildren(parentId: string): Promise<
    { studentId: string; classId: string; gradeId: string; schoolId: string }[]
  >;

  /** 查学生所属班级 */
  findStudentOrganization(studentId: string): Promise<
    { classId: string; gradeId: string; schoolId: string } | null
  >;
}

export class OrganizationResolver {
  constructor(private deps: OrganizationResolverDeps) {}

  /**
   * 解析组织归属
   *
   * 根据 actor.userType 分发到不同查询路径，
   * 最终统一返回 { schoolId, gradeIds, classIds }。
   */
  async resolve(actor: CurrentActor): Promise<Organization> {
    switch (actor.userType) {
      case 'SYSTEM_ADMIN':
        return this._resolveAdmin();

      case 'TEACHER':
        if (!actor.teacherId) return this._empty();
        return this._resolveTeacher(actor.teacherId);

      case 'PARENT':
        if (!actor.parentId) return this._empty();
        return this._resolveParent(actor.parentId);

      case 'STUDENT':
        // Student 目前 Sprint 2 无学生端，简化处理
        return this._empty();

      default:
        return this._empty();
    }
  }

  // ============================================================
  // 私有方法
  // ============================================================

  private _empty(): Organization {
    return { schoolId: '', gradeIds: [], classIds: [] };
  }

  private _resolveAdmin(): Organization {
    // 管理员无特定组织归属，isSchoolWide 由 DataScopeResolver 处理
    return this._empty();
  }

  private async _resolveTeacher(teacherId: string): Promise<Organization> {
    const relations = await this.deps.findTeacherClassRelations(teacherId);
    return this._merge(relations);
  }

  private async _resolveParent(parentId: string): Promise<Organization> {
    const children = await this.deps.findParentChildren(parentId);
    return this._merge(children.map((c) => ({
      classId: c.classId,
      gradeId: c.gradeId,
      schoolId: c.schoolId,
    })));
  }

  /** 合并多个组织记录，去重 */
  private _merge(
    items: { classId: string; gradeId: string; schoolId: string }[]
  ): Organization {
    if (items.length === 0) return this._empty();

    const schoolId = items[0].schoolId;
    const gradeIds = [...new Set(items.map((i) => i.gradeId))];
    const classIds = [...new Set(items.map((i) => i.classId))];

    return { schoolId, gradeIds, classIds };
  }
}
