/**
 * 测试 6: Sprint 2.1 Day 5.1–5.2 — Authorization（RBAC + Organization + DataScope）
 *
 * 上游规则：docs/10-Permission.md §16 权限矩阵 + Sprint 2.1 Day 5.1/5.2 刘老师拍板
 *
 * 验收要求：
 * 1. ✅ RoleCode / PermissionCode enum 值正确
 * 2. ✅ getPermissions(role) 不暴露 Map，返回 ReadonlySet
 * 3. ✅ AuthorizationService 权限判断
 * 4. ✅ OrganizationResolver.resolve(actor) → Organization
 * 5. ✅ DataScopeResolver.resolve(actor) → DataScope
 * 6. ✅ AuthorizationResolver 调用 OrganizationResolver + DataScopeResolver
 * 7. ✅ AuthorizationContext 含 issuedAt
 */

import { RoleCode } from '@smartgrade/shared/enums/RoleCode';
import { PermissionCode } from '@smartgrade/shared/enums/PermissionCode';
import { getPermissions } from '../authorization/role-permission.map';
import {
  AuthorizationService,
  PermissionDeniedError,
} from '../authorization/authorization.service';
import { AuthorizationResolver } from '../authorization/authorization.resolver';
import { OrganizationResolver } from '../authorization/organization.resolver';
import { DataScopeResolver } from '../authorization/data-scope.resolver';
import type { AuthorizationContext, CurrentActor, AuthorizationInfo } from '../authorization/types';

// ============================================================
// 工厂函数
// ============================================================

function buildCtx(
  actor: Partial<CurrentActor> = {},
  auth: Partial<AuthorizationInfo> = {}
): AuthorizationContext {
  return {
    actor: {
      userId: 'usr_test_001',
      teacherId: 'tch_test_001',
      parentId: null,
      userType: 'TEACHER',
      ...actor,
    },
    authorization: {
      roleSet: new Set<RoleCode>(),
      permissionSet: new Set<PermissionCode>(),
      organization: { schoolId: 'sch_test_001', gradeIds: [], classIds: [] },
      dataScope: { classIds: [], gradeIds: [], isSchoolWide: false, isParentScoped: false, version: 1 },
      ...auth,
    },
    issuedAt: new Date('2026-07-20T10:00:00Z'),
  };
}

// ============================================================
// 测试 1: enum + getPermissions
// ============================================================

describe('测试 6: Day 5.1–5.2 Authorization', () => {
  describe('Step 1+2: RoleCode / PermissionCode 枚举', () => {
    it('✅ 1.1 RoleCode 8 个值全部存在且带 ROLE_ 前缀', () => {
      expect(RoleCode.ROLE_ADMIN).toBe('ROLE_ADMIN');
      expect(RoleCode.ROLE_GRADE_DIRECTOR).toBe('ROLE_GRADE_DIRECTOR');
      expect(RoleCode.ROLE_POLITICAL).toBe('ROLE_POLITICAL');
      expect(RoleCode.ROLE_HEADMASTER).toBe('ROLE_HEADMASTER');
      expect(RoleCode.ROLE_SUBJECT_TEACHER).toBe('ROLE_SUBJECT_TEACHER');
      expect(RoleCode.ROLE_DORM_MANAGER).toBe('ROLE_DORM_MANAGER');
      expect(RoleCode.ROLE_PARENT).toBe('ROLE_PARENT');
      expect(RoleCode.ROLE_STUDENT).toBe('ROLE_STUDENT');
    });

    it('✅ 1.2 PermissionCode 用 domain.action 三级命名', () => {
      expect(PermissionCode.LEAVE_CREATE).toBe('leave.create');
      expect(PermissionCode.LEAVE_APPROVE).toBe('leave.approve');
      expect(PermissionCode.NOTICE_PUBLISH).toBe('notice.publish');
      expect(PermissionCode.SYSTEM_ADMIN).toBe('system.admin');
    });
  });

  describe('Step 3: getPermissions() 函数', () => {
    it('✅ 2.1 getPermissions 覆盖全部 8 个角色', () => {
      expect(getPermissions(RoleCode.ROLE_ADMIN).size).toBeGreaterThan(0);
      expect(getPermissions(RoleCode.ROLE_HEADMASTER).size).toBeGreaterThan(0);
      expect(getPermissions(RoleCode.ROLE_PARENT).size).toBeGreaterThan(0);
      expect(getPermissions(RoleCode.ROLE_STUDENT).size).toBeGreaterThan(0);
    });

    it('✅ 2.2 不存在的角色返回空 Set', () => {
      // @ts-expect-error 故意传非法角色
      const empty = getPermissions('ROLE_NOT_EXIST');
      expect(empty.size).toBe(0);
    });

    it('✅ 2.3 ADMIN 拥有全部权限（28 个）', () => {
      const perms = getPermissions(RoleCode.ROLE_ADMIN);
      expect(perms.size).toBe(28);
      expect(perms.has(PermissionCode.SYSTEM_ADMIN)).toBe(true);
      expect(perms.has(PermissionCode.LEAVE_APPROVE)).toBe(true);
      expect(perms.has(PermissionCode.NOTICE_PUBLISH)).toBe(true);
    });

    it('✅ 2.4 SUBJECT_TEACHER 无学生管理权限', () => {
      const perms = getPermissions(RoleCode.ROLE_SUBJECT_TEACHER);
      expect(perms.has(PermissionCode.STUDENT_READ)).toBe(false);
      expect(perms.has(PermissionCode.LEAVE_CREATE)).toBe(false);
      expect(perms.has(PermissionCode.LEAVE_APPROVE)).toBe(false);
      expect(perms.has(PermissionCode.SYSTEM_ADMIN)).toBe(false);
      expect(perms.has(PermissionCode.WORKBENCH_VIEW)).toBe(true);
      expect(perms.has(PermissionCode.NOTICE_READ)).toBe(true);
    });
  });

  // ============================================================
  // 测试 2: AuthorizationService
  // ============================================================

  describe('Step 4: AuthorizationService', () => {
    const svc = new AuthorizationService();

    it('✅ 3.1 hasPermission：有权限返回 true', () => {
      const ctx = buildCtx({}, { permissionSet: new Set([PermissionCode.LEAVE_APPROVE]) });
      expect(svc.hasPermission(ctx, PermissionCode.LEAVE_APPROVE)).toBe(true);
    });

    it('✅ 3.2 hasPermission：无权限返回 false', () => {
      const ctx = buildCtx({}, { permissionSet: new Set([PermissionCode.LEAVE_READ]) });
      expect(svc.hasPermission(ctx, PermissionCode.LEAVE_APPROVE)).toBe(false);
    });

    it('✅ 3.3 hasRole：有角色返回 true', () => {
      const ctx = buildCtx({}, { roleSet: new Set([RoleCode.ROLE_POLITICAL]) });
      expect(svc.hasRole(ctx, RoleCode.ROLE_POLITICAL)).toBe(true);
    });

    it('✅ 3.4 hasRole：无角色返回 false', () => {
      const ctx = buildCtx({}, { roleSet: new Set([RoleCode.ROLE_HEADMASTER]) });
      expect(svc.hasRole(ctx, RoleCode.ROLE_POLITICAL)).toBe(false);
    });

    it('✅ 3.5 requirePermission：有权限不抛错', () => {
      const ctx = buildCtx({}, { permissionSet: new Set([PermissionCode.NOTICE_PUBLISH]) });
      expect(() => svc.requirePermission(ctx, PermissionCode.NOTICE_PUBLISH)).not.toThrow();
    });

    it('✅ 3.6 requirePermission：无权限抛 PermissionDeniedError', () => {
      const ctx = buildCtx(
        { userId: 'usr_test_002' },
        { permissionSet: new Set([PermissionCode.LEAVE_READ]) }
      );
      expect(() => svc.requirePermission(ctx, PermissionCode.LEAVE_APPROVE)).toThrow(
        PermissionDeniedError
      );
    });

    it('✅ 3.7 PermissionDeniedError 携带 permission 和 actorId', () => {
      const ctx = buildCtx({ userId: 'usr_test_003' }, { permissionSet: new Set() });
      try {
        svc.requirePermission(ctx, PermissionCode.SYSTEM_ADMIN);
        fail('应该抛 PermissionDeniedError');
      } catch (e: any) {
        expect(e).toBeInstanceOf(PermissionDeniedError);
        expect(e.permission).toBe(PermissionCode.SYSTEM_ADMIN);
        expect(e.actorId).toBe('usr_test_003');
        expect(e.message).toContain('system.admin');
      }
    });

    it('✅ 3.8 requireAnyPermission：有任意一个权限即可', () => {
      const ctx = buildCtx({}, { permissionSet: new Set([PermissionCode.LEAVE_READ]) });
      expect(() =>
        svc.requireAnyPermission(ctx, PermissionCode.LEAVE_APPROVE, PermissionCode.LEAVE_READ)
      ).not.toThrow();
    });

    it('✅ 3.9 requireAnyPermission：全部没有则抛错', () => {
      const ctx = buildCtx({}, { permissionSet: new Set([PermissionCode.NOTICE_READ]) });
      expect(() =>
        svc.requireAnyPermission(ctx, PermissionCode.LEAVE_APPROVE, PermissionCode.SYSTEM_ADMIN)
      ).toThrow(PermissionDeniedError);
    });

    it('✅ 3.10 requireAllPermissions：必须全部有', () => {
      const ctx = buildCtx({}, {
        permissionSet: new Set([PermissionCode.LEAVE_READ, PermissionCode.LEAVE_APPROVE]),
      });
      expect(() =>
        svc.requireAllPermissions(ctx, PermissionCode.LEAVE_READ, PermissionCode.LEAVE_APPROVE)
      ).not.toThrow();
    });

    it('✅ 3.11 requireAllPermissions：缺一个则抛错', () => {
      const ctx = buildCtx({}, { permissionSet: new Set([PermissionCode.LEAVE_READ]) });
      expect(() =>
        svc.requireAllPermissions(ctx, PermissionCode.LEAVE_READ, PermissionCode.LEAVE_APPROVE)
      ).toThrow(PermissionDeniedError);
    });
  });

  // ============================================================
  // 测试 3: OrganizationResolver
  // ============================================================

  describe('Step 5.2-1: OrganizationResolver', () => {
    it('✅ 4.1 TEACHER → 查 TeacherClassRelations，返回 schoolId + gradeIds + classIds', async () => {
      const deps = {
        findTeacherClassRelations: jest.fn().mockResolvedValue([
          { classId: 'cls_001', gradeId: 'grd_001', schoolId: 'sch_001' },
          { classId: 'cls_002', gradeId: 'grd_001', schoolId: 'sch_001' },
        ]),
        findParentChildren: jest.fn(),
        findStudentOrganization: jest.fn(),
      };
      const resolver = new OrganizationResolver(deps);
      const actor: CurrentActor = { userId: 'u1', teacherId: 't1', parentId: null, userType: 'TEACHER' };
      const org = await resolver.resolve(actor);

      expect(org.schoolId).toBe('sch_001');
      expect(org.gradeIds).toEqual(['grd_001']);
      expect(org.classIds).toEqual(['cls_001', 'cls_002']);
      expect(deps.findTeacherClassRelations).toHaveBeenCalledWith('t1');
    });

    it('✅ 4.2 PARENT → 查孩子组织', async () => {
      const deps = {
        findTeacherClassRelations: jest.fn(),
        findParentChildren: jest.fn().mockResolvedValue([
          { studentId: 'stu_001', classId: 'cls_003', gradeId: 'grd_002', schoolId: 'sch_002' },
        ]),
        findStudentOrganization: jest.fn(),
      };
      const resolver = new OrganizationResolver(deps);
      const actor: CurrentActor = { userId: 'u2', teacherId: null, parentId: 'p1', userType: 'PARENT' };
      const org = await resolver.resolve(actor);

      expect(org.schoolId).toBe('sch_002');
      expect(org.classIds).toEqual(['cls_003']);
      expect(deps.findParentChildren).toHaveBeenCalledWith('p1');
    });

    it('✅ 4.3 SYSTEM_ADMIN → 空组织', async () => {
      const deps = {
        findTeacherClassRelations: jest.fn(),
        findParentChildren: jest.fn(),
        findStudentOrganization: jest.fn(),
      };
      const resolver = new OrganizationResolver(deps);
      const actor: CurrentActor = { userId: 'u3', teacherId: null, parentId: null, userType: 'SYSTEM_ADMIN' };
      const org = await resolver.resolve(actor);

      expect(org.schoolId).toBe('');
      expect(org.gradeIds).toEqual([]);
      expect(org.classIds).toEqual([]);
    });

    it('✅ 4.4 教师无 teacherId → 空组织', async () => {
      const deps = {
        findTeacherClassRelations: jest.fn(),
        findParentChildren: jest.fn(),
        findStudentOrganization: jest.fn(),
      };
      const resolver = new OrganizationResolver(deps);
      const actor: CurrentActor = { userId: 'u4', teacherId: null, parentId: null, userType: 'TEACHER' };
      const org = await resolver.resolve(actor);

      expect(org.schoolId).toBe('');
      expect(deps.findTeacherClassRelations).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // 测试 4: DataScopeResolver
  // ============================================================

  describe('Step 5.2-2: DataScopeResolver', () => {
    it('✅ 5.1 ADMIN → isSchoolWide = true', async () => {
      const deps = {
        findTeacherClassRelations: jest.fn(),
        findTeacherDirectedGrades: jest.fn(),
        findParentStudentIds: jest.fn(),
      };
      const resolver = new DataScopeResolver(deps);
      const actor: CurrentActor = { userId: 'u1', teacherId: null, parentId: null, userType: 'SYSTEM_ADMIN' };
      const scope = await resolver.resolve(actor);

      expect(scope.isSchoolWide).toBe(true);
      expect(scope.isParentScoped).toBe(false);
      expect(scope.classIds).toEqual([]);
    });

    it('✅ 5.2 TEACHER（班主任 + 年级主任）→ classIds + gradeIds', async () => {
      const deps = {
        findTeacherClassRelations: jest.fn().mockResolvedValue([
          { classId: 'cls_001', gradeId: 'grd_001', schoolId: 'sch_001', role: 'HEAD_TEACHER' },
          { classId: 'cls_002', gradeId: 'grd_001', schoolId: 'sch_001', role: 'SUBJECT_TEACHER' },
        ]),
        findTeacherDirectedGrades: jest.fn().mockResolvedValue(['grd_002']),
        findParentStudentIds: jest.fn(),
      };
      const resolver = new DataScopeResolver(deps);
      const actor: CurrentActor = { userId: 'u2', teacherId: 't1', parentId: null, userType: 'TEACHER' };
      const scope = await resolver.resolve(actor);

      expect(scope.classIds).toEqual(['cls_001', 'cls_002']);
      expect(scope.gradeIds).toEqual(['grd_001', 'grd_002']);
      expect(scope.isSchoolWide).toBe(false);
      expect(scope.isParentScoped).toBe(false);
    });

    it('✅ 5.3 TEACHER（政教，无班级关系）→ isSchoolWide = true', async () => {
      const deps = {
        findTeacherClassRelations: jest.fn().mockResolvedValue([]),
        findTeacherDirectedGrades: jest.fn().mockResolvedValue([]),
        findParentStudentIds: jest.fn(),
      };
      const resolver = new DataScopeResolver(deps);
      const actor: CurrentActor = { userId: 'u3', teacherId: 't2', parentId: null, userType: 'TEACHER' };
      const scope = await resolver.resolve(actor);

      expect(scope.isSchoolWide).toBe(true);
      expect(scope.classIds).toEqual([]);
      expect(scope.gradeIds).toEqual([]);
    });

    it('✅ 5.4 PARENT → isParentScoped = true', async () => {
      const deps = {
        findTeacherClassRelations: jest.fn(),
        findTeacherDirectedGrades: jest.fn(),
        findParentStudentIds: jest.fn().mockResolvedValue(['stu_001', 'stu_002']),
      };
      const resolver = new DataScopeResolver(deps);
      const actor: CurrentActor = { userId: 'u4', teacherId: null, parentId: 'p1', userType: 'PARENT' };
      const scope = await resolver.resolve(actor);

      expect(scope.isParentScoped).toBe(true);
      expect(scope.isSchoolWide).toBe(false);
      expect(deps.findParentStudentIds).toHaveBeenCalledWith('p1');
    });
  });

  // ============================================================
  // 测试 5: AuthorizationResolver（整合版）
  // ============================================================

  describe('Step 5.2-3: AuthorizationResolver 整合', () => {
    function createMockOrgResolver(org: { schoolId: string; gradeIds: string[]; classIds: string[] }) {
      return { resolve: jest.fn().mockResolvedValue(org) } as unknown as OrganizationResolver;
    }
    function createMockScopeResolver(scope: { classIds: string[]; gradeIds: string[]; isSchoolWide: boolean; isParentScoped: boolean; version: number }) {
      return { resolve: jest.fn().mockResolvedValue(scope) } as unknown as DataScopeResolver;
    }

    it('✅ 6.1 SYSTEM_ADMIN → ROLE_ADMIN + 28 权限 + 组织 + DataScope + issuedAt', async () => {
      const deps = {
        findUserById: jest.fn().mockResolvedValue({
          id: 'usr_admin_001', userType: 'SYSTEM_ADMIN' as const,
          teacherId: null, parentId: null,
        }),
        findRolesByTeacherId: jest.fn(),
      };
      const orgResolver = createMockOrgResolver({ schoolId: '', gradeIds: [], classIds: [] });
      const scopeResolver = createMockScopeResolver({
        classIds: [], gradeIds: [], isSchoolWide: true, isParentScoped: false, version: 1,
      });
      const resolver = new AuthorizationResolver(deps, orgResolver, scopeResolver);
      const ctx = await resolver.resolve('usr_admin_001');

      expect(ctx.actor.userType).toBe('SYSTEM_ADMIN');
      expect(ctx.authorization.roleSet.has(RoleCode.ROLE_ADMIN)).toBe(true);
      expect(ctx.authorization.permissionSet.size).toBe(28);
      expect(ctx.authorization.dataScope.isSchoolWide).toBe(true);
      expect(ctx.issuedAt).toBeInstanceOf(Date);
      expect(orgResolver.resolve).toHaveBeenCalledWith(ctx.actor);
      expect(scopeResolver.resolve).toHaveBeenCalledWith(ctx.actor);
    });

    it('✅ 6.2 TEACHER（班主任）→ 组织 + DataScope 正确填充', async () => {
      const deps = {
        findUserById: jest.fn().mockResolvedValue({
          id: 'usr_teach_001', userType: 'TEACHER' as const,
          teacherId: 'tch_001', parentId: null,
        }),
        findRolesByTeacherId: jest.fn().mockResolvedValue([RoleCode.ROLE_HEADMASTER]),
      };
      const orgResolver = createMockOrgResolver({
        schoolId: 'sch_001', gradeIds: ['grd_001'], classIds: ['cls_001'],
      });
      const scopeResolver = createMockScopeResolver({
        classIds: ['cls_001'], gradeIds: [], isSchoolWide: false, isParentScoped: false, version: 1,
      });
      const resolver = new AuthorizationResolver(deps, orgResolver, scopeResolver);
      const ctx = await resolver.resolve('usr_teach_001');

      expect(ctx.authorization.roleSet.has(RoleCode.ROLE_HEADMASTER)).toBe(true);
      expect(ctx.authorization.permissionSet.has(PermissionCode.LEAVE_CREATE)).toBe(true);
      expect(ctx.authorization.organization.schoolId).toBe('sch_001');
      expect(ctx.authorization.organization.classIds).toEqual(['cls_001']);
      expect(ctx.authorization.dataScope.classIds).toEqual(['cls_001']);
      expect(ctx.authorization.dataScope.isSchoolWide).toBe(false);
    });

    it('✅ 6.3 PARENT → ROLE_PARENT + isParentScoped', async () => {
      const deps = {
        findUserById: jest.fn().mockResolvedValue({
          id: 'usr_parent_001', userType: 'PARENT' as const,
          teacherId: null, parentId: 'par_001',
        }),
        findRolesByTeacherId: jest.fn(),
      };
      const orgResolver = createMockOrgResolver({
        schoolId: 'sch_002', gradeIds: ['grd_002'], classIds: ['cls_003'],
      });
      const scopeResolver = createMockScopeResolver({
        classIds: [], gradeIds: [], isSchoolWide: false, isParentScoped: true, version: 1,
      });
      const resolver = new AuthorizationResolver(deps, orgResolver, scopeResolver);
      const ctx = await resolver.resolve('usr_parent_001');

      expect(ctx.actor.userType).toBe('PARENT');
      expect(ctx.authorization.roleSet.has(RoleCode.ROLE_PARENT)).toBe(true);
      expect(ctx.authorization.dataScope.isParentScoped).toBe(true);
    });

    it('✅ 6.4 User 不存在 → 抛错', async () => {
      const deps = {
        findUserById: jest.fn().mockResolvedValue(null),
        findRolesByTeacherId: jest.fn(),
      };
      const orgResolver = createMockOrgResolver({ schoolId: '', gradeIds: [], classIds: [] });
      const scopeResolver = createMockScopeResolver({
        classIds: [], gradeIds: [], isSchoolWide: false, isParentScoped: false, version: 1,
      });
      const resolver = new AuthorizationResolver(deps, orgResolver, scopeResolver);
      await expect(resolver.resolve('usr_not_found')).rejects.toThrow('User not found');
    });

    it('✅ 6.5 多角色合并权限取并集', async () => {
      const deps = {
        findUserById: jest.fn().mockResolvedValue({
          id: 'usr_multi_001', userType: 'TEACHER' as const,
          teacherId: 'tch_multi', parentId: null,
        }),
        findRolesByTeacherId: jest.fn().mockResolvedValue([
          RoleCode.ROLE_HEADMASTER,
          RoleCode.ROLE_GRADE_DIRECTOR,
        ]),
      };
      const orgResolver = createMockOrgResolver({ schoolId: 'sch_001', gradeIds: [], classIds: [] });
      const scopeResolver = createMockScopeResolver({
        classIds: [], gradeIds: [], isSchoolWide: false, isParentScoped: false, version: 1,
      });
      const resolver = new AuthorizationResolver(deps, orgResolver, scopeResolver);
      const ctx = await resolver.resolve('usr_multi_001');

      expect(ctx.authorization.roleSet.size).toBe(2);
      expect(ctx.authorization.permissionSet.has(PermissionCode.LEAVE_CREATE)).toBe(true);
      expect(ctx.authorization.permissionSet.has(PermissionCode.NOTICE_PUBLISH)).toBe(true);
      expect(ctx.authorization.permissionSet.has(PermissionCode.SYSTEM_ADMIN)).toBe(false);
    });
  });
});
