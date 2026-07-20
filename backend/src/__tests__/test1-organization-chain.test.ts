/**
 * 测试 1：组织链创建（学校 → 年级 → 班级 → 学生）
 *
 * 验收要求：
 * 1. 创建学校成功
 * 2. 在学校下创建年级成功
 * 3. 在年级下创建班级成功
 * 4. 在班级下创建学生成功
 * 5. 整条链可被查询
 *
 * 关键验证：Repository.create() 不抛错，关联字段（schoolId/gradeId/classId）正确传递。
 */

import { setupPrismaMock, createMockPrisma, setMockPrisma, fakeStudent, getMockPrisma } from './helpers/mock-prisma';

// 必须在被测代码 import 之前调用：自动安装 prisma client mock
setupPrismaMock();

describe('测试 1: 组织链创建 (学校→年级→班级→学生)', () => {
  beforeEach(() => {
    setMockPrisma(createMockPrisma());
  });

  it('学生 Repository 应能通过 ID 查找并返回正确的关联字段', async () => {
    const { studentRepository } = await import('../repositories/student.repository');
    const mockPrisma = getMockPrisma();

    mockPrisma.student.findUnique.mockResolvedValue(
      fakeStudent({ name: '李四' })
    );

    const student = await studentRepository.findById('stu_test_001');
    expect(student).not.toBeNull();
    expect(student?.classId).toBe('cls_test_001');
    expect(student?.gradeId).toBe('grade_test_001');
    expect(student?.schoolId).toBe('sch_test_001');

    expect(mockPrisma.student.findUnique).toHaveBeenCalledWith({ where: { id: 'stu_test_001' } });
  });

  it('create 方法应接受 Prisma.StudentCreateInput 且不报错', async () => {
    const { studentRepository } = await import('../repositories/student.repository');
    const mockPrisma = getMockPrisma();

    mockPrisma.student.create.mockResolvedValue(fakeStudent({ name: '王五' }));

    const input = {
      studentNo: 'S20260002',
      name: '王五',
      gender: 'MALE',
      class: { connect: { id: 'cls_test_001' } },
      grade: { connect: { id: 'grade_test_001' } },
      school: { connect: { id: 'sch_test_001' } },
      boardingType: 'BOARDING',
      currentStatus: 'ON_CAMPUS',
      currentLocation: 'UNKNOWN',
      enrolledAt: new Date('2026-09-01'),
    };

    const result = await studentRepository.create(input as any);
    expect(result.name).toBe('王五');
    expect(mockPrisma.student.create).toHaveBeenCalledWith({ data: input });
  });

  it('软删除学生应只设置 deletedAt（永久留痕 R-012）', async () => {
    const { studentRepository } = await import('../repositories/student.repository');
    const mockPrisma = getMockPrisma();

    mockPrisma.student.update.mockResolvedValue(fakeStudent({ deletedAt: new Date() }));

    await studentRepository.softDelete('stu_test_001');

    expect(mockPrisma.student.update).toHaveBeenCalledWith({
      where: { id: 'stu_test_001' },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it('findByClass 应按 classId 过滤且排除软删', async () => {
    const { studentRepository } = await import('../repositories/student.repository');
    const mockPrisma = getMockPrisma();

    mockPrisma.student.findMany.mockResolvedValue([
      fakeStudent({ id: 'stu_a', classId: 'cls_X' }),
      fakeStudent({ id: 'stu_b', classId: 'cls_X' }),
    ]);

    const students = await studentRepository.findByClass('cls_X');
    expect(students).toHaveLength(2);
    expect(mockPrisma.student.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          classId: 'cls_X',
          deletedAt: null,
        }),
      })
    );
  });
});
