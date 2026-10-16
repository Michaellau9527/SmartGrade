/**
 * 测试 18：班级管理权限闭环 + 数据范围 + 删除安全
 *
 * 覆盖验收场景：
 * 1. 管理员新增 / 编辑 / 删除班级成功
 * 2. 年级主任在授权年级内新增 / 编辑 / 删除成功
 * 3. 年级主任操作其他年级班级被后端拒绝（403）
 * 4. 班主任 / 任课教师直接请求管理接口被后端拒绝（权限守卫层）
 * 5. 删除仍有关联学生 / 业务记录的班级被安全拦截（400，且不执行删除）
 * 6. 无权限用户无法绕过前端限制（服务层数据范围 + 权限矩阵）
 * 7. 角色 → 权限矩阵与后端要求一致（前端隐藏按钮不可替代后端校验）
 *
 * 说明：本测试不连真实数据库，通过 mock Prisma 验证服务行为与调用参数。
 */

import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { createMockPrisma, setMockPrisma, getMockPrisma } from './helpers/mock-prisma';
import { ClassService } from '../modules/class/class.service';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { getPermissions } from '../authorization/role-permission.map';
import { RoleCode } from '@smartgrade/shared/enums/RoleCode';
import { PermissionCode } from '@smartgrade/shared/enums/PermissionCode';

// ---------- 用户夹具（dataScope 与 jwt.strategy 计算口径一致） ----------

const ADMIN = {
  id: 1,
  teacherNo: 'T001',
  name: '系统管理员',
  roles: ['ROLE_ADMIN'],
  permissions: ['class:read', 'class:create', 'class:update', 'class:delete'],
  dataScope: { type: 'ALL' },
} as any;

const GRADE_DIRECTOR = {
  id: 'teacher_gd_a',
  teacherNo: 'GD001',
  name: 'A年级主任',
  roles: ['ROLE_GRADE_DIRECTOR'],
  permissions: ['class:read', 'class:create', 'class:update', 'class:delete'],
  dataScope: { type: 'GRADE', gradeId: 'grade_a' },
} as any;

const HEADMASTER = {
  id: 'teacher_hm_a',
  teacherNo: 'HM001',
  name: 'A班班主任',
  roles: ['ROLE_HEADMASTER'],
  permissions: ['class:read'],
  dataScope: { type: 'CLASS', classId: 'cls_a', gradeId: 'grade_a' },
} as any;

const SUBJECT_TEACHER = {
  id: 'teacher_st_1',
  teacherNo: 'ST001',
  name: '任课教师',
  roles: ['ROLE_SUBJECT_TEACHER'],
  permissions: [],
  dataScope: { type: 'SELF' },
} as any;

const GRADE_A = { id: 'grade_a', schoolId: 'sch_1', deletedAt: null, name: '高二' };

function makeService(): { service: ClassService; prisma: any } {
  const prisma = createMockPrisma();
  setMockPrisma(prisma);
  const service = new ClassService(prisma);
  return { service, prisma };
}

describe('测试 18: 班级管理（权限 + 数据范围 + 删除安全）', () => {
  afterEach(() => {
    setMockPrisma(createMockPrisma());
  });

  // ============================================================
  // 1. 管理员
  // ============================================================
  describe('1. 管理员（dataScope = ALL）', () => {
    it('列表不加数据范围限制（where 不含 gradeId/id 限定）', async () => {
      const { service, prisma } = makeService();
      prisma.class.findMany.mockResolvedValue([]);
      prisma.class.count.mockResolvedValue(0);
      prisma.school.findMany.mockResolvedValue([]);

      await service.findAll({ page: 1, pageSize: 20, skip: 0, take: 20 } as any, ADMIN);

      const where = prisma.class.findMany.mock.calls[0][0].where;
      expect(where).toEqual({ deletedAt: null });
    });

    it('新增班级成功：schoolId 由年级推导（不接受前端传入）', async () => {
      const { service, prisma } = makeService();
      prisma.grade.findUnique.mockResolvedValue(GRADE_A);
      prisma.class.findFirst.mockResolvedValue(null); // 无重复编码
      prisma.class.create.mockResolvedValue({
        id: 'cls_new',
        gradeId: 'grade_a',
        schoolId: 'sch_1',
        code: '20',
        name: '高二(20)班',
        headTeacherId: null,
        studentCount: 0,
        status: 'ACTIVE',
      });
      prisma.school.findMany.mockResolvedValue([
        { id: 'sch_1', name: '示范中学', shortName: '示范' },
      ]);

      const result: any = await service.create(
        { gradeId: 'grade_a', code: '20', name: '高二(20)班' } as any,
        ADMIN,
      );

      expect(prisma.class.create).toHaveBeenCalledTimes(1);
      const data = prisma.class.create.mock.calls[0][0].data;
      expect(data.gradeId).toBe('grade_a');
      // 关键：schoolId 来自 grade.schoolId，而非请求体
      expect(data.schoolId).toBe('sch_1');
      expect(result.school).toEqual({ id: 'sch_1', name: '示范中学', shortName: '示范' });
    });

    it('新增班级：同年级编码重复 → 400', async () => {
      const { service, prisma } = makeService();
      prisma.grade.findUnique.mockResolvedValue(GRADE_A);
      prisma.class.findFirst.mockResolvedValue({ id: 'cls_exists', deletedAt: null });

      await expect(
        service.create({ gradeId: 'grade_a', code: '14', name: '重复班' } as any, ADMIN),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.class.create).not.toHaveBeenCalled();
    });

    it('编辑班级成功（换年级时同步重推 schoolId）', async () => {
      const { service, prisma } = makeService();
      prisma.class.findUnique.mockResolvedValue({
        id: 'cls_1',
        gradeId: 'grade_a',
        code: '14',
        name: '高二(14)班',
        schoolId: 'sch_1',
      });
      prisma.grade.findUnique.mockResolvedValue({
        id: 'grade_b',
        schoolId: 'sch_2',
        deletedAt: null,
      });
      prisma.class.findFirst.mockResolvedValue(null);
      prisma.class.update.mockResolvedValue({
        id: 'cls_1',
        gradeId: 'grade_b',
        schoolId: 'sch_2',
        code: '14',
        name: '高二(14)班',
      });
      prisma.school.findMany.mockResolvedValue([]);

      await service.update('cls_1', { gradeId: 'grade_b', name: '高二(14)班' } as any, ADMIN);

      const data = prisma.class.update.mock.calls[0][0].data;
      expect(data.grade).toEqual({ connect: { id: 'grade_b' } });
      expect(data.schoolId).toBe('sch_2');
    });

    it('删除无关联班级成功（软删除，不物理删除）', async () => {
      const { service, prisma } = makeService();
      prisma.class.findUnique.mockResolvedValue({
        id: 'cls_1',
        gradeId: 'grade_a',
        name: '高二(14)班',
        code: '14',
      });
      prisma.student.count.mockResolvedValue(0);
      prisma.teacherClassRelation.count.mockResolvedValue(0);
      prisma.leaveRecord.count.mockResolvedValue(0);
      prisma.timelineEvent.count.mockResolvedValue(0);
      prisma.class.update.mockResolvedValue({});

      const result = await service.remove('cls_1', ADMIN);

      expect(result).toEqual({ success: true });
      const updateArg = prisma.class.update.mock.calls[0][0];
      expect(updateArg.where).toEqual({ id: 'cls_1' });
      expect(updateArg.data.deletedAt).toBeInstanceOf(Date);
    });
  });

  // ============================================================
  // 2 / 3. 年级主任
  // ============================================================
  describe('2 & 3. 年级主任（dataScope = GRADE / grade_a）', () => {
    it('列表仅返回本年级班级（where.gradeId = scope.gradeId）', async () => {
      const { service, prisma } = makeService();
      prisma.class.findMany.mockResolvedValue([]);
      prisma.class.count.mockResolvedValue(0);

      await service.findAll({ page: 1, pageSize: 20, skip: 0, take: 20 } as any, GRADE_DIRECTOR);

      const where = prisma.class.findMany.mock.calls[0][0].where;
      expect(where.gradeId).toBe('grade_a');
    });

    it('新增班级成功（在授权年级内）', async () => {
      const { service, prisma } = makeService();
      prisma.grade.findUnique.mockResolvedValue(GRADE_A);
      prisma.class.findFirst.mockResolvedValue(null);
      prisma.class.create.mockResolvedValue({
        id: 'cls_new',
        gradeId: 'grade_a',
        schoolId: 'sch_1',
        code: '21',
        name: '高二(21)班',
        studentCount: 0,
        status: 'ACTIVE',
      });
      prisma.school.findMany.mockResolvedValue([]);

      await service.create({ gradeId: 'grade_a', code: '21', name: '高二(21)班' } as any, GRADE_DIRECTOR);

      expect(prisma.class.create).toHaveBeenCalledTimes(1);
    });

    it('新增班级：不传 gradeId 时，采用授权范围年级（不信任前端）', async () => {
      const { service, prisma } = makeService();
      prisma.grade.findUnique.mockResolvedValue(GRADE_A);
      prisma.class.findFirst.mockResolvedValue(null);
      prisma.class.create.mockResolvedValue({ id: 'cls_x', gradeId: 'grade_a', schoolId: 'sch_1' });
      prisma.school.findMany.mockResolvedValue([]);

      await service.create({ code: '22', name: '高二(22)班' } as any, GRADE_DIRECTOR);

      // 查年级时使用的必是授权范围年级
      expect(prisma.grade.findUnique.mock.calls[0][0].where).toEqual({ id: 'grade_a' });
      expect(prisma.class.create.mock.calls[0][0].data.gradeId).toBe('grade_a');
    });

    it('新增班级：前端伪造其他年级 gradeId → 403', async () => {
      const { service, prisma } = makeService();

      await expect(
        service.create({ gradeId: 'grade_b', code: '01', name: '越权班' } as any, GRADE_DIRECTOR),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(prisma.grade.findUnique).not.toHaveBeenCalled();
      expect(prisma.class.create).not.toHaveBeenCalled();
    });

    it('编辑其他年级班级 → 403，且不执行更新', async () => {
      const { service, prisma } = makeService();
      prisma.class.findUnique.mockResolvedValue({
        id: 'cls_b',
        gradeId: 'grade_b',
        code: '01',
        name: 'B年级1班',
        schoolId: 'sch_1',
      });

      await expect(
        service.update('cls_b', { name: '改名' } as any, GRADE_DIRECTOR),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(prisma.class.update).not.toHaveBeenCalled();
    });

    it('编辑本年级班级成功', async () => {
      const { service, prisma } = makeService();
      prisma.class.findUnique.mockResolvedValue({
        id: 'cls_a',
        gradeId: 'grade_a',
        code: '14',
        name: '高二(14)班',
        schoolId: 'sch_1',
      });
      prisma.class.findFirst.mockResolvedValue(null);
      prisma.class.update.mockResolvedValue({
        id: 'cls_a',
        gradeId: 'grade_a',
        schoolId: 'sch_1',
        code: '14',
        name: '高二(14)班(改)',
      });
      prisma.school.findMany.mockResolvedValue([]);

      await service.update('cls_a', { name: '高二(14)班(改)' } as any, GRADE_DIRECTOR);

      expect(prisma.class.update).toHaveBeenCalledTimes(1);
    });

    it('删除本年级无关联班级成功', async () => {
      const { service, prisma } = makeService();
      prisma.class.findUnique.mockResolvedValue({
        id: 'cls_a2',
        gradeId: 'grade_a',
        name: '高二(15)班',
        code: '15',
      });
      prisma.student.count.mockResolvedValue(0);
      prisma.teacherClassRelation.count.mockResolvedValue(0);
      prisma.leaveRecord.count.mockResolvedValue(0);
      prisma.timelineEvent.count.mockResolvedValue(0);
      prisma.class.update.mockResolvedValue({});

      await expect(service.remove('cls_a2', GRADE_DIRECTOR)).resolves.toEqual({ success: true });
    });

    it('删除其他年级班级 → 403，且不执行任何计数/删除', async () => {
      const { service, prisma } = makeService();
      prisma.class.findUnique.mockResolvedValue({
        id: 'cls_b',
        gradeId: 'grade_b',
        name: 'B年级1班',
        code: '01',
      });

      await expect(service.remove('cls_b', GRADE_DIRECTOR)).rejects.toBeInstanceOf(
        ForbiddenException,
      );

      expect(prisma.student.count).not.toHaveBeenCalled();
      expect(prisma.class.update).not.toHaveBeenCalled();
    });

    it('查看其他年级班级详情 → 404（越权按不存在处理）', async () => {
      const { service, prisma } = makeService();
      prisma.class.findUnique.mockResolvedValue({
        id: 'cls_b',
        gradeId: 'grade_b',
        schoolId: 'sch_1',
        code: '01',
        name: 'B年级1班',
      });

      await expect(service.findOne('cls_b', GRADE_DIRECTOR)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  // ============================================================
  // 5. 删除安全
  // ============================================================
  describe('5. 删除关联数据安全拦截', () => {
    const baseMock = (prisma: any) => {
      prisma.class.findUnique.mockResolvedValue({
        id: 'cls_1',
        gradeId: 'grade_a',
        name: '高二(14)班',
        code: '14',
      });
      prisma.student.count.mockResolvedValue(0);
      prisma.teacherClassRelation.count.mockResolvedValue(0);
      prisma.leaveRecord.count.mockResolvedValue(0);
      prisma.timelineEvent.count.mockResolvedValue(0);
      prisma.class.update.mockResolvedValue({});
    };

    it('仍有关联学生 → 400 且不执行删除', async () => {
      const { service, prisma } = makeService();
      baseMock(prisma);
      prisma.student.count.mockResolvedValue(3);

      await expect(service.remove('cls_1', ADMIN)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.class.update).not.toHaveBeenCalled();
    });

    it('仍有关联教师班级关系 → 400', async () => {
      const { service, prisma } = makeService();
      baseMock(prisma);
      prisma.teacherClassRelation.count.mockResolvedValue(2);

      await expect(service.remove('cls_1', ADMIN)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.class.update).not.toHaveBeenCalled();
    });

    it('仍有关联请假记录 → 400', async () => {
      const { service, prisma } = makeService();
      baseMock(prisma);
      prisma.leaveRecord.count.mockResolvedValue(1);

      await expect(service.remove('cls_1', ADMIN)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.class.update).not.toHaveBeenCalled();
    });

    it('仍有关联时间轴事件 → 400', async () => {
      const { service, prisma } = makeService();
      baseMock(prisma);
      prisma.timelineEvent.count.mockResolvedValue(5);

      await expect(service.remove('cls_1', ADMIN)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.class.update).not.toHaveBeenCalled();
    });

    it('拦截提示包含具体关联数据类别', async () => {
      const { service, prisma } = makeService();
      baseMock(prisma);
      prisma.student.count.mockResolvedValue(3);
      prisma.leaveRecord.count.mockResolvedValue(2);

      await expect(service.remove('cls_1', ADMIN)).rejects.toThrow(/3 名学生/);
      await expect(service.remove('cls_1', ADMIN)).rejects.toThrow(/2 条请假记录/);
    });
  });

  // ============================================================
  // 4 / 7. 权限守卫层 + 权限矩阵
  // ============================================================
  describe('4 & 7. 权限守卫与角色权限矩阵（后端权威校验）', () => {
    function makeContext(user: any) {
      return {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({ getRequest: () => ({ user }) }),
      } as any;
    }

    const requireClassDelete = { getAllAndOverride: () => ['class:delete'] } as any;

    it('班主任直接请求"删除班级"接口 → 403（不能绕过前端隐藏按钮）', () => {
      const guard = new PermissionsGuard(requireClassDelete);
      expect(() => guard.canActivate(makeContext(HEADMASTER))).toThrow(ForbiddenException);
    });

    it('任课教师直接请求"删除班级"接口 → 403', () => {
      const guard = new PermissionsGuard(requireClassDelete);
      expect(() => guard.canActivate(makeContext(SUBJECT_TEACHER))).toThrow(ForbiddenException);
    });

    it('年级主任请求"删除班级"接口 → 放行（范围校验在服务层）', () => {
      const guard = new PermissionsGuard(requireClassDelete);
      expect(guard.canActivate(makeContext(GRADE_DIRECTOR))).toBe(true);
    });

    it('管理员短路放行（ROLE_ADMIN 全权限）', () => {
      const guard = new PermissionsGuard(requireClassDelete);
      const adminNoPerms = { ...ADMIN, permissions: [] };
      expect(guard.canActivate(makeContext(adminNoPerms))).toBe(true);
    });

    it('角色→权限矩阵：仅 ADMIN / GRADE_DIRECTOR 具备班级写权限', () => {
      const all = [
        PermissionCode.CLASS_READ,
        PermissionCode.CLASS_CREATE,
        PermissionCode.CLASS_UPDATE,
        PermissionCode.CLASS_DELETE,
      ];

      for (const p of all) {
        expect(getPermissions(RoleCode.ROLE_ADMIN).has(p)).toBe(true);
        expect(getPermissions(RoleCode.ROLE_GRADE_DIRECTOR).has(p)).toBe(true);
      }

      // 只读角色：可读、不可写
      expect(getPermissions(RoleCode.ROLE_HEADMASTER).has(PermissionCode.CLASS_READ)).toBe(true);
      expect(getPermissions(RoleCode.ROLE_HEADMASTER).has(PermissionCode.CLASS_CREATE)).toBe(false);
      expect(getPermissions(RoleCode.ROLE_HEADMASTER).has(PermissionCode.CLASS_DELETE)).toBe(false);

      expect(getPermissions(RoleCode.ROLE_POLITICAL).has(PermissionCode.CLASS_READ)).toBe(true);
      expect(getPermissions(RoleCode.ROLE_POLITICAL).has(PermissionCode.CLASS_DELETE)).toBe(false);

      // 任课教师 / 宿管：完全无班级权限
      for (const p of all) {
        expect(getPermissions(RoleCode.ROLE_SUBJECT_TEACHER).has(p)).toBe(false);
        expect(getPermissions(RoleCode.ROLE_DORM_MANAGER).has(p)).toBe(false);
      }
    });
  });

  // ============================================================
  // 服务层兜底：无班级管理范围的写法一律拒绝
  // ============================================================
  describe('6. 服务层数据范围兜底', () => {
    it('班主任（CLASS 范围）新增班级 → 403', async () => {
      const { service } = makeService();
      await expect(
        service.create({ gradeId: 'grade_a', code: '01', name: 'X' } as any, HEADMASTER),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('任课教师（SELF 范围）编辑班级 → 403', async () => {
      const { service, prisma } = makeService();
      prisma.class.findUnique.mockResolvedValue({
        id: 'cls_a',
        gradeId: 'grade_a',
        code: '14',
        name: '高二(14)班',
        schoolId: 'sch_1',
      });
      await expect(
        service.update('cls_a', { name: 'X' } as any, SUBJECT_TEACHER),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('任课教师（SELF 范围）列表返回空集（不可能匹配条件）', async () => {
      const { service, prisma } = makeService();
      prisma.class.findMany.mockResolvedValue([]);
      prisma.class.count.mockResolvedValue(0);

      await service.findAll({ page: 1, pageSize: 20, skip: 0, take: 20 } as any, SUBJECT_TEACHER);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect((getMockPrisma().class.findMany as jest.Mock).mock.calls[0][0].where.id).toBe(
        '__nonexistent__',
      );
    });
  });
});
