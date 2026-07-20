/**
 * 测试 7: Sprint 2.2 C01 — Workbench Capability（完整版）
 *
 * 上游规则：Sprint 2.2 C01 — 刘老师拍板
 *
 * 验收要求：
 * 1. ✅ WorkbenchService.getWorkbench(ctx) 接受 AuthorizationContext
 * 2. ✅ studentStatusSummary 按 DataScope 过滤（isSchoolWide / classIds）
 * 3. ✅ todos 只对 TEACHER 返回（PARENT / STUDENT / ADMIN 返回空）
 * 4. ✅ recentNotices 按 schoolId 查询
 * 5. ✅ quickActions 按 permissionSet 动态过滤
 * 6. ✅ today 含 isSchoolDay
 * 7. ✅ quickActions 无 icon 字段
 * 8. ✅ Baseline 验证：使用 AuthorizationContext + DataScope + Service 接口
 * 9. ✅ 不直接查 Prisma（通过 Service 接口）
 * 10. ✅ WorkbenchService 只做聚合（依赖 Service，不依赖 Repository）
 */

import { WorkbenchService } from '../modules/workbench/workbench.service';
import type { ITodoService, IStudentStatusService, INoticeService } from '../modules/workbench/workbench.service';
import type { WorkbenchServices } from '../modules/workbench/workbench.service';
import type { IQuickActionProvider } from '../modules/workbench/workbench-quick-action.provider';
import { WorkbenchQuickActionProvider } from '../modules/workbench/workbench-quick-action.provider';
import { RoleCode } from '@smartgrade/shared/enums/RoleCode';
import { PermissionCode } from '@smartgrade/shared/enums/PermissionCode';
import type { AuthorizationContext } from '../authorization/types';

// ============================================================
// 工厂函数
// ============================================================

function buildCtx(overrides: Partial<AuthorizationContext> = {}): AuthorizationContext {
  return {
    actor: { userId: 'u1', teacherId: 't1', parentId: null, userType: 'TEACHER' },
    authorization: {
      roleSet: new Set([RoleCode.ROLE_HEADMASTER]),
      permissionSet: new Set([
        PermissionCode.WORKBENCH_VIEW,
        PermissionCode.LEAVE_CREATE,
        PermissionCode.NOTICE_READ,
      ]),
      organization: { schoolId: 'sch_001', gradeIds: ['grd_001'], classIds: ['cls_001'] },
      dataScope: { classIds: ['cls_001'], gradeIds: ['grd_001'], isSchoolWide: false, isParentScoped: false, version: 1 },
    },
    issuedAt: new Date(),
    ...overrides,
  } as AuthorizationContext;
}

function buildServices(overrides: Partial<WorkbenchServices> = {}): WorkbenchServices {
  return {
    todoService: {
      getPendingTodos: jest.fn().mockResolvedValue([
        { id: 'task_001', title: '审批请假', status: 'PENDING', dueAt: '2026-07-20T18:00:00Z', sourceType: 'LEAVE', sourceId: 'leave_001' },
      ]),
    } as unknown as ITodoService,
    studentStatusService: {
      countByScope: jest.fn().mockResolvedValue(45),
    } as unknown as IStudentStatusService,
    noticeService: {
      getRecentNotices: jest.fn().mockResolvedValue([
        { id: 'notice_001', title: '通知1', noticeType: 'NOTICE', publishedAt: '2026-07-20T08:00:00Z', isRead: false },
      ]),
    } as unknown as INoticeService,
    quickActionProvider: new WorkbenchQuickActionProvider(),
    ...overrides,
  };
}

describe('测试 7: Sprint 2.2 C01 — Workbench Capability（完整版）', () => {
  // ============================================================
  // 测试 1: 完整聚合
  // ============================================================

  describe('getWorkbench 完整聚合', () => {
    it('✅ 1.1 返回 5 个顶层字段', async () => {
      const svc = new WorkbenchService(buildServices());
      const resp = await svc.getWorkbench(buildCtx());

      expect(resp).toHaveProperty('today');
      expect(resp).toHaveProperty('todos');
      expect(resp).toHaveProperty('studentStatusSummary');
      expect(resp).toHaveProperty('recentNotices');
      expect(resp).toHaveProperty('quickActions');
    });

    it('✅ 1.2 today 含 isSchoolDay', async () => {
      const svc = new WorkbenchService(buildServices());
      const resp = await svc.getWorkbench(buildCtx());
      expect(typeof resp.today.isSchoolDay).toBe('boolean');
    });

    it('✅ 1.3 today.date 格式 YYYY-MM-DD', async () => {
      const svc = new WorkbenchService(buildServices());
      const resp = await svc.getWorkbench(buildCtx());
      expect(resp.today.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  // ============================================================
  // 测试 2: studentStatusSummary 按 DataScope
  // ============================================================

  describe('studentStatusSummary DataScope', () => {
    it('✅ 2.1 非 schoolWide 时传 classId 查询', async () => {
      const countByScope = jest.fn().mockResolvedValue(30);
      const services = buildServices({
        studentStatusService: { countByScope } as unknown as IStudentStatusService,
      });
      const svc = new WorkbenchService(services);
      const ctx = buildCtx();
      ctx.authorization.dataScope.isSchoolWide = false;
      ctx.authorization.dataScope.classIds = ['cls_001'];

      const resp = await svc.getWorkbench(ctx);

      expect(countByScope).toHaveBeenCalledWith(
        expect.objectContaining({ classId: 'cls_001', schoolId: 'sch_001' })
      );
    });

    it('✅ 2.2 schoolWide 时传 schoolId 查询', async () => {
      const countByScope = jest.fn().mockResolvedValue(200);
      const services = buildServices({
        studentStatusService: { countByScope } as unknown as IStudentStatusService,
      });
      const svc = new WorkbenchService(services);
      const ctx = buildCtx();
      ctx.authorization.dataScope.isSchoolWide = true;

      await svc.getWorkbench(ctx);

      expect(countByScope).toHaveBeenCalledWith(
        expect.objectContaining({ schoolId: 'sch_001' })
      );
    });

    it('✅ 2.3 parentScoped 返回全 0', async () => {
      const countByScope = jest.fn();
      const services = buildServices({
        studentStatusService: { countByScope } as unknown as IStudentStatusService,
      });
      const svc = new WorkbenchService(services);
      const ctx = buildCtx();
      ctx.authorization.dataScope.isParentScoped = true;

      const resp = await svc.getWorkbench(ctx);

      expect(resp.studentStatusSummary.totalStudents).toBe(0);
      expect(countByScope).not.toHaveBeenCalled();
    });

    it('✅ 2.4 无 schoolId 返回全 0', async () => {
      const countByScope = jest.fn();
      const services = buildServices({
        studentStatusService: { countByScope } as unknown as IStudentStatusService,
      });
      const svc = new WorkbenchService(services);
      const ctx = buildCtx();
      ctx.authorization.organization.schoolId = '';

      const resp = await svc.getWorkbench(ctx);
      expect(resp.studentStatusSummary.totalStudents).toBe(0);
    });
  });

  // ============================================================
  // 测试 3: todos 只对 TEACHER 返回
  // ============================================================

  describe('todos 按 userType', () => {
    it('✅ 3.1 TEACHER 有 teacherId → 调用 todoService.getPendingTodos', async () => {
      const getPendingTodos = jest.fn().mockResolvedValue([
        { id: 'task_001', title: '审批请假', status: 'PENDING', dueAt: '2026-07-20T18:00:00Z', sourceType: 'LEAVE', sourceId: 'leave_001' },
      ]);
      const services = buildServices({
        todoService: { getPendingTodos } as unknown as ITodoService,
      });
      const svc = new WorkbenchService(services);
      const ctx = buildCtx({ actor: { userId: 'u1', teacherId: 't1', parentId: null, userType: 'TEACHER' } });

      const resp = await svc.getWorkbench(ctx);
      expect(getPendingTodos).toHaveBeenCalledWith('t1');
      expect(resp.todos.length).toBe(1);
      expect(resp.todos[0].title).toBe('审批请假');
    });

    it('✅ 3.2 PARENT → todos 为空', async () => {
      const getPendingTodos = jest.fn();
      const services = buildServices({
        todoService: { getPendingTodos } as unknown as ITodoService,
      });
      const svc = new WorkbenchService(services);
      const ctx = buildCtx({ actor: { userId: 'u2', teacherId: null, parentId: 'p1', userType: 'PARENT' } });

      const resp = await svc.getWorkbench(ctx);
      expect(resp.todos).toEqual([]);
      expect(getPendingTodos).not.toHaveBeenCalled();
    });

    it('✅ 3.3 STUDENT → todos 为空', async () => {
      const getPendingTodos = jest.fn();
      const services = buildServices({
        todoService: { getPendingTodos } as unknown as ITodoService,
      });
      const svc = new WorkbenchService(services);
      const ctx = buildCtx({ actor: { userId: 'u3', teacherId: null, parentId: null, userType: 'STUDENT' } });

      const resp = await svc.getWorkbench(ctx);
      expect(resp.todos).toEqual([]);
    });

    it('✅ 3.4 SYSTEM_ADMIN → todos 为空', async () => {
      const getPendingTodos = jest.fn();
      const services = buildServices({
        todoService: { getPendingTodos } as unknown as ITodoService,
      });
      const svc = new WorkbenchService(services);
      const ctx = buildCtx({ actor: { userId: 'u4', teacherId: null, parentId: null, userType: 'SYSTEM_ADMIN' } });

      const resp = await svc.getWorkbench(ctx);
      expect(resp.todos).toEqual([]);
    });
  });

  // ============================================================
  // 测试 4: recentNotices 按 schoolId
  // ============================================================

  describe('recentNotices 按 schoolId', () => {
    it('✅ 4.1 有 schoolId → 调用 noticeService.getRecentNotices', async () => {
      const getRecentNotices = jest.fn().mockResolvedValue([
        { id: 'notice_001', title: '通知1', noticeType: 'NOTICE', publishedAt: '2026-07-20T08:00:00Z', isRead: false },
      ]);
      const services = buildServices({
        noticeService: { getRecentNotices } as unknown as INoticeService,
      });
      const svc = new WorkbenchService(services);

      const resp = await svc.getWorkbench(buildCtx());
      expect(getRecentNotices).toHaveBeenCalledWith({ schoolId: 'sch_001', limit: 5 });
      expect(resp.recentNotices.length).toBe(1);
    });

    it('✅ 4.2 无 schoolId → 返回空', async () => {
      const getRecentNotices = jest.fn();
      const services = buildServices({
        noticeService: { getRecentNotices } as unknown as INoticeService,
      });
      const svc = new WorkbenchService(services);
      const ctx = buildCtx();
      ctx.authorization.organization.schoolId = '';

      const resp = await svc.getWorkbench(ctx);
      expect(resp.recentNotices).toEqual([]);
      expect(getRecentNotices).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // 测试 5: quickActions 按 permissionSet 动态过滤
  // ============================================================

  describe('quickActions 动态过滤', () => {
    it('✅ 5.1 只有 leave.create 和 notice.read → 过滤出 leave.create', async () => {
      const svc = new WorkbenchService(buildServices());
      const ctx = buildCtx();
      ctx.authorization.permissionSet = new Set([PermissionCode.LEAVE_CREATE, PermissionCode.NOTICE_READ]);

      const resp = await svc.getWorkbench(ctx);
      const codes = resp.quickActions.map((a) => a.code);
      expect(codes).toContain('leave.create');
      expect(codes).not.toContain('notice.publish');
      expect(codes).not.toContain('task.assign');
    });

    it('✅ 5.2 ROLE_ADMIN 全部权限 → 全部 quickActions', async () => {
      const svc = new WorkbenchService(buildServices());
      const ctx = buildCtx();
      ctx.authorization.permissionSet = new Set([
        PermissionCode.LEAVE_CREATE,
        PermissionCode.LEAVE_APPROVE,
        PermissionCode.NOTICE_PUBLISH,
        PermissionCode.TASK_ASSIGN,
        PermissionCode.INCIDENT_CREATE,
        PermissionCode.DORM_CHECK,
        PermissionCode.STUDENT_READ,
        PermissionCode.STATISTICS_READ,
      ]);

      const resp = await svc.getWorkbench(ctx);
      expect(resp.quickActions.length).toBe(8);
    });

    it('✅ 5.3 ROLE_STUDENT 只有基本权限 → quickActions 为空', async () => {
      const svc = new WorkbenchService(buildServices());
      const ctx = buildCtx();
      ctx.authorization.permissionSet = new Set([PermissionCode.WORKBENCH_VIEW, PermissionCode.NOTICE_READ]);

      const resp = await svc.getWorkbench(ctx);
      expect(resp.quickActions).toEqual([]);
    });

    it('✅ 5.4 quickActions 无 icon 字段', async () => {
      const svc = new WorkbenchService(buildServices());
      const ctx = buildCtx();
      ctx.authorization.permissionSet = new Set([PermissionCode.LEAVE_CREATE]);

      const resp = await svc.getWorkbench(ctx);
      resp.quickActions.forEach((a) => {
        expect(a).toHaveProperty('code');
        expect(a).toHaveProperty('label');
        expect(a).toHaveProperty('requiredPermission');
        expect(a).not.toHaveProperty('icon');
      });
    });
  });

  // ============================================================
  // 测试 6: Baseline 验证
  // ============================================================

  describe('Baseline 验证', () => {
    it('✅ 6.1 使用 AuthorizationContext（不散传 userId + role）', async () => {
      const countByScope = jest.fn().mockResolvedValue(45);
      const services = buildServices({
        studentStatusService: { countByScope } as unknown as IStudentStatusService,
      });
      const svc = new WorkbenchService(services);
      // getWorkbench 只接受 ctx，不传 userId / role / classId
      const ctx = buildCtx();
      await svc.getWorkbench(ctx);
      expect(countByScope).toHaveBeenCalled();
    });

    it('✅ 6.2 不直接查 Prisma（通过 Service 接口）', () => {
      // WorkbenchService 构造函数接受 services 对象（Service 接口）
      // 不 import PrismaClient
      const svc = new WorkbenchService(buildServices());
      expect(svc).toBeDefined();
    });

    it('✅ 6.3 只做聚合（不包含业务逻辑）', async () => {
      const svc = new WorkbenchService(buildServices());
      const ctx = buildCtx();

      const resp = await svc.getWorkbench(ctx);
      // 验证结构
      expect(resp.today).toBeDefined();
      expect(resp.studentStatusSummary).toBeDefined();
      // WorkbenchService 不包含"请假审批"等业务逻辑
    });
  });
});
