/**
 * 测试 2：班主任只能看到本班
 *
 * 验收要求：
 * 1. 班主任通过 teacher_id → teacher_class_relation 查班
 * 2. 只能取到 endDate IS NULL 的"当前有效"关系（v1.3 关键）
 * 3. 历史关系（endDate NOT NULL）不能出现在工作台
 *
 * 关键验证：
 * - TeacherRepository.findCurrentHeadTeacher() 必传 where.endDate = null
 * - findCurrentRelations() 同上
 * - findAllRelations() 不带 endDate 过滤（历史用）
 * - transferTeacher() 关闭旧关系 + 创建新关系
 */

import { setupPrismaMock, createMockPrisma, setMockPrisma, fakeStudent, getMockPrisma } from './helpers/mock-prisma';

setupPrismaMock();

describe('测试 2: 班主任权限（teacher_id → teacher_class_relation → students）', () => {
  beforeEach(() => {
    setMockPrisma(createMockPrisma());
  });

  it('findCurrentHeadTeacher 必须过滤 endDate = null（v1.3 关键）', async () => {
    const { teacherRepository } = await import('../repositories/teacher.repository');
    const mockPrisma = getMockPrisma();

    mockPrisma.teacherClassRelation.findFirst.mockResolvedValue({
      id: 'tcr_001',
      teacherId: 'teacher_001',
      classId: 'cls_001',
      role: 'HEAD_TEACHER',
      subject: null,
      startDate: new Date('2026-09-01'),
      endDate: null,
      teacher: { id: 'teacher_001', name: '张老师' },
    });

    await teacherRepository.findCurrentHeadTeacher('cls_001');

    expect(mockPrisma.teacherClassRelation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          classId: 'cls_001',
          role: 'HEAD_TEACHER',
          endDate: null,
        }),
      })
    );
  });

  it('findCurrentRelations 只取当前有效关系（endDate = null）', async () => {
    const { teacherRepository } = await import('../repositories/teacher.repository');
    const mockPrisma = getMockPrisma();

    mockPrisma.teacherClassRelation.findMany.mockResolvedValue([
      { id: 'tcr_001', teacherId: 'teacher_001', classId: 'cls_001', role: 'HEAD_TEACHER', endDate: null },
    ]);

    await teacherRepository.findCurrentRelations('teacher_001');

    expect(mockPrisma.teacherClassRelation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          teacherId: 'teacher_001',
          endDate: null,
        }),
      })
    );
  });

  it('findAllRelations 应包含历史（不过滤 endDate）', async () => {
    const { teacherRepository } = await import('../repositories/teacher.repository');
    const mockPrisma = getMockPrisma();

    mockPrisma.teacherClassRelation.findMany.mockResolvedValue([
      { id: 'tcr_old', endDate: new Date('2026-10-01') },
      { id: 'tcr_new', endDate: null },
    ]);

    await teacherRepository.findAllRelations('teacher_001');

    const call = mockPrisma.teacherClassRelation.findMany.mock.calls[0][0];
    expect(call.where).toEqual({ teacherId: 'teacher_001' });
    expect(call.where.endDate).toBeUndefined();
  });

  it('transferTeacher 必须在事务中：关闭旧关系 + 创建新关系（保留历史 R-014）', async () => {
    const { teacherRepository } = await import('../repositories/teacher.repository');
    const mockPrisma = getMockPrisma();

    const mockTx = {
      teacherClassRelation: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue({ id: 'tcr_new' }),
      },
    };
    mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockTx));

    await teacherRepository.transferTeacher({
      teacherId: 'teacher_001',
      fromClassId: 'cls_old',
      toClassId: 'cls_new',
      role: 'HEAD_TEACHER',
      transferDate: new Date('2026-11-01'),
    });

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockTx.teacherClassRelation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          teacherId: 'teacher_001',
          classId: 'cls_old',
          role: 'HEAD_TEACHER',
          endDate: null,
        }),
        data: expect.objectContaining({ endDate: new Date('2026-11-01') }),
      })
    );
    expect(mockTx.teacherClassRelation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          teacherId: 'teacher_001',
          classId: 'cls_new',
          role: 'HEAD_TEACHER',
          startDate: new Date('2026-11-01'),
        }),
      })
    );
  });

  it('StudentRepository.findByClass 应返回该班所有未删除学生（班主任视图）', async () => {
    const { studentRepository } = await import('../repositories/student.repository');
    const mockPrisma = getMockPrisma();

    mockPrisma.student.findMany.mockResolvedValue([
      fakeStudent({ id: 'stu_001', classId: 'cls_001' }),
      fakeStudent({ id: 'stu_002', classId: 'cls_001' }),
    ]);

    const students = await studentRepository.findByClass('cls_001');

    expect(mockPrisma.student.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          classId: 'cls_001',
          deletedAt: null,
        }),
      })
    );
    expect(students).toHaveLength(2);
  });
});
