/**
 * 测试 14: TeacherService.assignRoles 角色分配修复
 *
 * 验收要求：
 *  1. ✅ 正常分配白名单角色：删除 + 写入各一次，返回读回的角色编码
 *  2. ✅ 空数组 = 显式清空：仅执行 DELETE，不做角色校验，返回空角色
 *  3. ✅ 存在无效角色 ID：BadRequestException，且 DELETE 未被执行（校验先于删除）
 *  4. ✅ 白名单外（ROLE_ADMIN）：ForbiddenException，且 DELETE 未被执行
 *  5. ✅ 重复角色 ID：去重后写入（INSERT 参数不含重复项）
 *  6. ✅ 教师不存在 / 已删除：NotFoundException，事务未进入
 *  7. ✅ 写入失败：异常向上传播
 *  8. ✅ AssignRolesDto：缺失 / 非数组 / 非正整数 / 0 → 校验失败；[1,2] → 通过
 *
 * 边界说明：本文件为 Mock 单元测试，验证校验顺序、白名单与服务返回值。
 * 真实数据库事务回滚由 Prisma $transaction 在运行时保证，需在联调环境另行确认；
 * Mock 结果不作为真实回滚证明。
 */

import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { setupPrismaMock, getMockPrisma, setMockPrisma, createMockPrisma } from './helpers/mock-prisma';

setupPrismaMock();

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { TeacherService } = require('../modules/teacher/teacher.service');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AssignRolesDto } = require('../modules/teacher/dto');

const TEACHER_ID = 't-uuid-0001';

function buildService(): any {
  return new TeacherService(getMockPrisma());
}

async function makeDto(roleIds: unknown): Promise<any> {
  const dto = new AssignRolesDto();
  (dto as any).roleIds = roleIds;
  return dto;
}

describe('测试 14: assignRoles 角色分配（校验先于删除 + 白名单 + 原子性）', () => {
  let prisma: any;
  let service: any;

  beforeEach(() => {
    setMockPrisma(createMockPrisma());
    prisma = getMockPrisma();
    service = buildService();
    // helper 不默认注入 raw SQL 方法，手动补齐（同 test13 先例）
    prisma.$queryRaw = jest.fn();
    prisma.$executeRaw = jest.fn();
    // 交互式事务：以同一 mock 执行回调（test11/test12 先例）
    prisma.$transaction = jest.fn(async (fn: any) => fn(prisma));
  });

  it('1. 正常分配白名单角色：删除+写入各一次，返回读回的角色', async () => {
    prisma.teacher.findUnique.mockResolvedValue({ id: TEACHER_ID, deletedAt: null });
    prisma.$queryRaw
      .mockResolvedValueOnce([{ role_code: 'ROLE_HEADMASTER' }]) // 角色校验
      .mockResolvedValueOnce([{ role_code: 'ROLE_HEADMASTER' }]); // 读回
    prisma.$executeRaw.mockResolvedValue(1);

    const result = await service.assignRoles(TEACHER_ID, await makeDto([2]));

    expect(result).toEqual({ success: true, teacherId: TEACHER_ID, roles: ['ROLE_HEADMASTER'] });
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(2); // DELETE + INSERT
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2); // 校验 + 读回
    // DELETE 参数化：teacher_id 作为绑定参数
    const deleteValues = prisma.$executeRaw.mock.calls[0].slice(1);
    expect(deleteValues).toEqual([TEACHER_ID]);
  });

  it('2. 空数组 = 显式清空：仅 DELETE，不做角色校验，返回空角色', async () => {
    prisma.teacher.findUnique.mockResolvedValue({ id: TEACHER_ID, deletedAt: null });
    prisma.$queryRaw.mockResolvedValueOnce([]); // 读回

    const result = await service.assignRoles(TEACHER_ID, await makeDto([]));

    expect(result).toEqual({ success: true, teacherId: TEACHER_ID, roles: [] });
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1); // 仅 DELETE
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1); // 仅读回
  });

  it('3. 存在无效角色 ID：BadRequestException，且不执行删除（校验先于删除）', async () => {
    prisma.teacher.findUnique.mockResolvedValue({ id: TEACHER_ID, deletedAt: null });
    prisma.$queryRaw.mockResolvedValueOnce([{ role_code: 'ROLE_HEADMASTER' }]); // 2 个入参只读回 1 行

    await expect(service.assignRoles(TEACHER_ID, await makeDto([2, 3]))).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('4. 白名单外（ROLE_ADMIN）：ForbiddenException，且不执行删除', async () => {
    prisma.teacher.findUnique.mockResolvedValue({ id: TEACHER_ID, deletedAt: null });
    prisma.$queryRaw.mockResolvedValueOnce([{ role_code: 'ROLE_ADMIN' }]);

    await expect(service.assignRoles(TEACHER_ID, await makeDto([1]))).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('5. 重复角色 ID 去重：INSERT 参数只含去重后的 (teacherId, roleId)', async () => {
    prisma.teacher.findUnique.mockResolvedValue({ id: TEACHER_ID, deletedAt: null });
    prisma.$queryRaw
      .mockResolvedValueOnce([{ role_code: 'ROLE_HEADMASTER' }])
      .mockResolvedValueOnce([{ role_code: 'ROLE_HEADMASTER' }]);
    prisma.$executeRaw.mockResolvedValue(1);

    await service.assignRoles(TEACHER_ID, await makeDto([2, 2, 2]));

    // 第二次 $executeRaw 为 INSERT；Prisma.join 返回的片段里 values 应为去重后的参数
    const insertFragment = prisma.$executeRaw.mock.calls[1][1];
    expect(insertFragment.values).toEqual([TEACHER_ID, BigInt(2)]);
  });

  it('6. 教师不存在：NotFoundException，事务未进入', async () => {
    prisma.teacher.findUnique.mockResolvedValue(null);

    await expect(service.assignRoles(TEACHER_ID, await makeDto([2]))).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('7. 教师已删除（deletedAt 非空）：NotFoundException', async () => {
    prisma.teacher.findUnique.mockResolvedValue({ id: TEACHER_ID, deletedAt: new Date() });

    await expect(service.assignRoles(TEACHER_ID, await makeDto([2]))).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('8. 写入失败：异常向上传播（真实回滚由数据库事务保证，Mock 仅验证传播路径）', async () => {
    prisma.teacher.findUnique.mockResolvedValue({ id: TEACHER_ID, deletedAt: null });
    prisma.$queryRaw.mockResolvedValueOnce([{ role_code: 'ROLE_HEADMASTER' }]);
    prisma.$executeRaw
      .mockResolvedValueOnce(1) // DELETE 成功
      .mockRejectedValueOnce(new Error('db write failed')); // INSERT 失败

    await expect(service.assignRoles(TEACHER_ID, await makeDto([2]))).rejects.toThrow(
      'db write failed',
    );
  });
});

describe('AssignRolesDto 校验（class-validator 纯函数，离线）', () => {
  it('9. 缺失 roleIds / 非数组 / 含非正整数 / 含 0 → 校验失败', async () => {
    expect((await validate(new AssignRolesDto())).length).toBeGreaterThan(0); // 缺失
    expect((await validate(await makeDto('not-array'))).length).toBeGreaterThan(0); // 非数组
    expect((await validate(await makeDto(['abc']))).length).toBeGreaterThan(0); // 非整数
    expect((await validate(await makeDto([1.5]))).length).toBeGreaterThan(0); // 小数
    expect((await validate(await makeDto([0]))).length).toBeGreaterThan(0); // 0
    expect((await validate(await makeDto([-1]))).length).toBeGreaterThan(0); // 负数
  });

  it('10. [1, 2] 合法通过', async () => {
    expect(await validate(await makeDto([1, 2]))).toHaveLength(0);
  });
});
