/**
 * 测试 19：请假列表契约（GET /leaves 分页结构 + 筛选 + 数据范围 + 字段命名）
 *
 * 背景（2026-10-16 P0 修复）：
 * 旧实现返回裸数组（take 50），admin 前端按 {list,total,page,pageSize} 解析，
 * 真实后端响应下 listData.list.filter(...) 直接 TypeError → 页面崩溃（ErrorBoundary）。
 *
 * 本测试锁定响应契约，防止回归：
 * 1. 响应为分页结构 { list, total, page, pageSize }
 * 2. 列表项字段 camelCase（leaveNo/studentName/studentNo/leaveType/reason/startAt/endAt/...）
 * 3. page/pageSize 正确转换为 skip/take；pageSize 上限 100
 * 4. status / leaveType 筛选参数生效
 * 5. 数据范围隔离：CLASS→本班、GRADE→本年级、SELF→空、ALL→不限制
 * 6. 空数据返回 { list: [], total: 0 } 而非裸数组/undefined
 *
 * 说明：不连真实数据库，mock PrismaService 验证 controller 行为与查询参数。
 */

import { LeaveController } from '../modules/leave/leave.controller';

// ---------- 夹具 ----------

function makeRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'leave_1',
    leaveNo: 'LV20261016001',
    status: 'PENDING',
    studentId: 'stu_1',
    studentName: '张三',
    className: '高二14班',
    leaveType: 'SICK',
    leaveReasonType: 'ILLNESS',
    reason: '发烧',
    startAt: new Date('2026-10-16T08:00:00Z'),
    endAt: new Date('2026-10-17T08:00:00Z'),
    applicantName: '李老师',
    createdAt: new Date('2026-10-16T07:00:00Z'),
    deletedAt: null,
    student: { studentNo: 'S2024001' },
    ...overrides,
  };
}

const ALL_USER = { id: 1, name: '管理员', roles: ['ROLE_ADMIN'], dataScope: { type: 'ALL' } } as any;
const CLASS_USER = {
  id: 'teacher_hm',
  name: '班主任',
  roles: ['ROLE_HEADMASTER'],
  dataScope: { type: 'CLASS', classId: 'cls_a', gradeId: 'grade_a' },
} as any;
const GRADE_USER = {
  id: 'teacher_gd',
  name: '年级主任',
  roles: ['ROLE_GRADE_DIRECTOR'],
  dataScope: { type: 'GRADE', gradeId: 'grade_a' },
} as any;
const SELF_USER = {
  id: 'teacher_st',
  name: '任课教师',
  roles: ['ROLE_SUBJECT_TEACHER'],
  dataScope: { type: 'SELF' },
} as any;

function makeController() {
  const prisma = {
    leaveRecord: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
  };
  const capability = {} as any;
  const controller = new LeaveController(capability, prisma as any);
  return { controller, prisma };
}

describe('测试 19: 请假列表契约（GET /leaves）', () => {
  // ============================================================
  // 1. 分页结构契约（P0 回归锁）
  // ============================================================
  describe('1. 分页结构契约', () => {
    it('返回 { list, total, page, pageSize }，非裸数组（P0 回归锁）', async () => {
      const { controller, prisma } = makeController();
      const rec = makeRecord();
      prisma.leaveRecord.findMany.mockResolvedValue([rec]);
      prisma.leaveRecord.count.mockResolvedValue(1);

      const res = await controller.list({} as any, ALL_USER);

      expect(res).not.toBeInstanceOf(Array);
      expect(Object.keys(res).sort()).toEqual(['list', 'page', 'pageSize', 'total']);
      expect(Array.isArray(res.list)).toBe(true);
      expect(res.total).toBe(1);
      expect(res.page).toBe(1);
      expect(res.pageSize).toBe(20);
    });

    it('空数据返回 { list: [], total: 0 }（不崩溃、不含 undefined list）', async () => {
      const { controller } = makeController();
      const res = await controller.list({} as any, ALL_USER);
      expect(res.list).toEqual([]);
      expect(res.total).toBe(0);
    });

    it('列表项字段 camelCase 且完整（leaveNo/studentName/studentNo/className/leaveType/leaveReasonType/reason/startAt/endAt/applicantName/createdAt）', async () => {
      const { controller, prisma } = makeController();
      prisma.leaveRecord.findMany.mockResolvedValue([makeRecord()]);

      const { list } = await controller.list({} as any, ALL_USER);
      const item = list[0];
      for (const key of [
        'id', 'leaveNo', 'status', 'studentId', 'studentName', 'studentNo',
        'className', 'leaveType', 'leaveReasonType', 'reason',
        'startAt', 'endAt', 'applicantName', 'createdAt',
      ]) {
        expect(item).toHaveProperty(key);
      }
      // 不允许出现 snake_case 字段
      for (const key of Object.keys(item)) {
        expect(key).not.toMatch(/_[a-z]/);
      }
      expect(item.studentNo).toBe('S2024001');
      expect(item.startAt).toBe('2026-10-16T08:00:00.000Z'); // ISO 序列化
      expect(item.createdAt).toBe('2026-10-16T07:00:00.000Z');
    });
  });

  // ============================================================
  // 2. 分页参数
  // ============================================================
  describe('2. 分页参数转换', () => {
    it('page=3, pageSize=10 → skip=20 take=10', async () => {
      const { controller, prisma } = makeController();
      await controller.list({ page: 3, pageSize: 10 } as any, ALL_USER);
      expect(prisma.leaveRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('pageSize=200 超上限 → 截断为 100（对齐后端 @Max(100) 约定）', async () => {
      const { controller, prisma } = makeController();
      await controller.list({ page: 1, pageSize: 200 } as any, ALL_USER);
      expect(prisma.leaveRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });

    it('不传分页参数 → 默认 page=1 pageSize=20', async () => {
      const { controller, prisma } = makeController();
      const res = await controller.list({} as any, ALL_USER);
      expect(prisma.leaveRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
      expect(res.page).toBe(1);
      expect(res.pageSize).toBe(20);
    });
  });

  // ============================================================
  // 3. 筛选参数
  // ============================================================
  describe('3. 筛选参数生效', () => {
    it('status=PENDING → where.status', async () => {
      const { controller, prisma } = makeController();
      await controller.list({ status: 'PENDING' } as any, ALL_USER);
      expect(prisma.leaveRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'PENDING' }) }),
      );
    });

    it('leaveType=SICK → where.leaveType', async () => {
      const { controller, prisma } = makeController();
      await controller.list({ leaveType: 'SICK' } as any, ALL_USER);
      expect(prisma.leaveRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ leaveType: 'SICK' }) }),
      );
    });

    it('status + leaveType 组合筛选', async () => {
      const { controller, prisma } = makeController();
      await controller.list({ status: 'APPROVED', leaveType: 'PERSONAL' } as any, ALL_USER);
      expect(prisma.leaveRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'APPROVED', leaveType: 'PERSONAL' }),
        }),
      );
    });
  });

  // ============================================================
  // 4. 数据范围隔离
  // ============================================================
  describe('4. 数据范围隔离', () => {
    it('班主任（CLASS）→ where.classId = 本班', async () => {
      const { controller, prisma } = makeController();
      await controller.list({} as any, CLASS_USER);
      expect(prisma.leaveRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ classId: 'cls_a' }) }),
      );
    });

    it('年级主任（GRADE）→ where.gradeId = 本年级', async () => {
      const { controller, prisma } = makeController();
      await controller.list({} as any, GRADE_USER);
      expect(prisma.leaveRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ gradeId: 'grade_a' }) }),
      );
    });

    it('任课教师（SELF）→ where.id = none（看不到任何请假）', async () => {
      const { controller, prisma } = makeController();
      await controller.list({} as any, SELF_USER);
      expect(prisma.leaveRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: 'none' }) }),
      );
    });

    it('管理员（ALL）→ 不附加班级/年级过滤', async () => {
      const { controller, prisma } = makeController();
      await controller.list({} as any, ALL_USER);
      const where = prisma.leaveRecord.findMany.mock.calls[0][0].where;
      expect(where).not.toHaveProperty('classId');
      expect(where).not.toHaveProperty('gradeId');
    });
  });

  // ============================================================
  // 5. 查询基础行为
  // ============================================================
  describe('5. 查询基础行为', () => {
    it('恒定过滤 deletedAt=null 且按 createdAt 倒序', async () => {
      const { controller, prisma } = makeController();
      await controller.list({} as any, ALL_USER);
      expect(prisma.leaveRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('total 使用相同 where 条件 count', async () => {
      const { controller, prisma } = makeController();
      prisma.leaveRecord.count.mockResolvedValue(7);
      const res = await controller.list({ status: 'PENDING' } as any, CLASS_USER);
      expect(prisma.leaveRecord.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ status: 'PENDING', classId: 'cls_a' }),
      });
      expect(res.total).toBe(7);
    });
  });
});
