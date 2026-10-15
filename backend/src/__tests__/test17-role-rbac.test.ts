/**
 * 测试 17: 角色权限越权修复回归测试
 *
 * 验收场景（覆盖用户要求的 4 类 + 系统角色泛化保护 + 创建校验）：
 *  assignPermissions：
 *   1. 普通管理员不能修改 ROLE_ADMIN 的权限 → Forbidden，且不写库
 *   2. 普通管理员不能修改其他系统角色（ROLE_HEADMASTER）权限 → Forbidden
 *   3. 普通管理员不能授予自身未持有的权限 → Forbidden，且不写库
 *   4. 普通管理员可修改自定义角色，且仅授予自身已持有的权限 → 成功写库
 *   5. 授予无效权限 ID → BadRequest
 *   6. 真正的超管（ROLE_ADMIN，permissions 为空）仍能正常授权系统角色 → 成功写库
 *  create：
 *   7. 普通管理员不能创建超管角色 ROLE_ADMIN → Forbidden，不写库
 *   8. 普通管理员不能创建任何系统角色（ROLE_HEADMASTER）→ Forbidden
 *   9. 非法格式 roleCode → BadRequest
 *  10. 空角色名称 → BadRequest
 *  11. 重复 roleCode → BadRequest（唯一性校验先于写入）
 *  12. 普通管理员可创建合法的自定义角色 → 成功写库
 *  13. 超管可创建系统角色 ROLE_ADMIN → 成功写库
 *  辅助：SYSTEM_ROLE_CODES / isSystemRole / isValidRoleCodeFormat 纯函数断言。
 *
 * 采用 mock Prisma（与 test14/16 一致），不依赖真实数据库，可在沙箱运行。
 */
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  SYSTEM_ROLE_CODES,
  ROLE_ADMIN,
  isSystemRole,
  isValidRoleCodeFormat,
} from '@/common/constants/system-roles';
import { createMockPrisma, createMockTable } from './helpers/mock-prisma';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { RoleService } = require('../modules/role/role.service');

function buildService(prisma: any): any {
  return new RoleService(prisma);
}

// 普通管理员（非 ROLE_ADMIN）：持有 role:assign-permission / role:create / student:read，
// 未持有 student:write / role:delete
const normalAdmin: any = {
  id: 'tch_ga',
  roles: ['ROLE_GRADE_DIRECTOR'],
  permissions: ['role:assign-permission', 'role:create', 'student:read'],
};

// 超级管理员：permissions 为空（PermissionsGuard 短路放行）
const superAdmin: any = {
  id: 'tch_admin',
  roles: [ROLE_ADMIN],
  permissions: [],
};

describe('系统角色判定规则（常数与辅助函数）', () => {
  it('SYSTEM_ROLE_CODES 覆盖 seed 的 7 个系统角色，且含 ROLE_ADMIN', () => {
    expect(SYSTEM_ROLE_CODES).toContain(ROLE_ADMIN);
    for (const code of [
      'ROLE_GRADE_DIRECTOR',
      'ROLE_POLITICAL',
      'ROLE_HEADMASTER',
      'ROLE_DORM_MANAGER',
      'ROLE_SUBJECT_TEACHER',
      'ROLE_GATE_GUARD',
    ]) {
      expect(SYSTEM_ROLE_CODES).toContain(code);
    }
    expect(SYSTEM_ROLE_CODES).toHaveLength(7);
  });

  it('isSystemRole：系统角色 true、自定义角色 false、空值 false', () => {
    expect(isSystemRole('ROLE_ADMIN')).toBe(true);
    expect(isSystemRole('ROLE_HEADMASTER')).toBe(true);
    expect(isSystemRole('ROLE_CLASS_MONITOR')).toBe(false);
    expect(isSystemRole(null)).toBe(false);
    expect(isSystemRole(undefined)).toBe(false);
    expect(isSystemRole('')).toBe(false);
  });

  it('isValidRoleCodeFormat：ROLE_ 前缀 + 大写字母/数字/下划线，长度 1–50', () => {
    expect(isValidRoleCodeFormat('ROLE_CLASS_MONITOR')).toBe(true);
    expect(isValidRoleCodeFormat('ROLE_A1_B2')).toBe(true);
    expect(isValidRoleCodeFormat('role_admin')).toBe(false); // 小写
    expect(isValidRoleCodeFormat('ADMIN')).toBe(false); // 无 ROLE_ 前缀
    expect(isValidRoleCodeFormat('ROLE_BAD-CODE')).toBe(false); // 连字符
    expect(isValidRoleCodeFormat('')).toBe(false);
    expect(isValidRoleCodeFormat(null)).toBe(false);
    expect(isValidRoleCodeFormat('ROLE_' + 'X'.repeat(50))).toBe(false); // 长度 55 > 50
  });
});

describe('assignPermissions 越权防护', () => {
  let prisma: any;
  let service: any;

  beforeEach(() => {
    prisma = createMockPrisma();
    prisma.role = createMockTable();
    prisma.permission = createMockTable();
    prisma.rolePermission = createMockTable();
    // 写库方法是代理自动生成的 jest.fn（默认抛“未配置”），成功路径需配置为静默 resolve，
    // 仅用于捕获调用参数（toHaveBeenCalledWith 仍生效）
    prisma.rolePermission.deleteMany.mockResolvedValue({ count: 0 });
    prisma.rolePermission.createMany.mockResolvedValue(undefined);
    service = buildService(prisma);
  });

  it('1. 普通管理员不能修改 ROLE_ADMIN 权限 → Forbidden，不写库', async () => {
    prisma.role.findUnique.mockResolvedValue({ id: 1n, roleCode: 'ROLE_ADMIN' });
    await expect(service.assignPermissions(1, [10], normalAdmin)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.rolePermission.deleteMany).not.toHaveBeenCalled();
    expect(prisma.rolePermission.createMany).not.toHaveBeenCalled();
  });

  it('2. 普通管理员不能修改其他系统角色（ROLE_HEADMASTER）权限 → Forbidden', async () => {
    prisma.role.findUnique.mockResolvedValue({ id: 2n, roleCode: 'ROLE_HEADMASTER' });
    await expect(service.assignPermissions(2, [10], normalAdmin)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.rolePermission.deleteMany).not.toHaveBeenCalled();
  });

  it('3. 普通管理员不能授予自身未持有的权限 → Forbidden，不写库', async () => {
    // 目标为自定义（非系统）角色，排除系统角色检查干扰，单独验证最小权限隔离
    prisma.role.findUnique.mockResolvedValue({ id: 5n, roleCode: 'ROLE_CLASS_MONITOR' });
    prisma.permission.findMany.mockResolvedValue([
      { id: 10n, permissionCode: 'student:read' }, // 持有
      { id: 20n, permissionCode: 'student:write' }, // 未持有
      { id: 30n, permissionCode: 'role:delete' }, // 未持有
    ]);
    await expect(service.assignPermissions(5, [10, 20, 30], normalAdmin)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.rolePermission.deleteMany).not.toHaveBeenCalled();
    expect(prisma.rolePermission.createMany).not.toHaveBeenCalled();
  });

  it('4. 普通管理员可修改自定义角色，且仅授予自身已持有的权限 → 成功写库', async () => {
    prisma.role.findUnique.mockResolvedValue({ id: 5n, roleCode: 'ROLE_CLASS_MONITOR' });
    prisma.permission.findMany.mockResolvedValue([{ id: 10n, permissionCode: 'student:read' }]);
    const res = await service.assignPermissions(5, [10], normalAdmin);
    expect(res).toEqual({ success: true });
    expect(prisma.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { roleId: 5n } });
    expect(prisma.rolePermission.createMany).toHaveBeenCalledWith({
      data: [{ roleId: 5n, permissionId: 10n }],
    });
  });

  it('5. 授予无效权限 ID → BadRequest', async () => {
    prisma.role.findUnique.mockResolvedValue({ id: 5n, roleCode: 'ROLE_CLASS_MONITOR' });
    prisma.permission.findMany.mockResolvedValue([]);
    await expect(service.assignPermissions(5, [999], normalAdmin)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('6. 真正的超管（ROLE_ADMIN，permissions 为空）仍能正常授权系统角色 → 成功写库', async () => {
    prisma.role.findUnique.mockResolvedValue({ id: 1n, roleCode: 'ROLE_ADMIN' });
    prisma.permission.findMany.mockResolvedValue([
      { id: 10n, permissionCode: 'student:read' },
      { id: 30n, permissionCode: 'role:delete' },
    ]);
    const res = await service.assignPermissions(1, [10, 30], superAdmin);
    expect(res).toEqual({ success: true });
    expect(prisma.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { roleId: 1n } });
    expect(prisma.rolePermission.createMany).toHaveBeenCalledWith({
      data: [
        { roleId: 1n, permissionId: 10n },
        { roleId: 1n, permissionId: 30n },
      ],
    });
  });
});

describe('create 越权与校验防护', () => {
  let prisma: any;
  let service: any;

  beforeEach(() => {
    prisma = createMockPrisma();
    prisma.role = createMockTable();
    prisma.permission = createMockTable();
    prisma.rolePermission = createMockTable();
    // 写库方法是代理自动生成的 jest.fn（默认抛“未配置”），成功路径需配置为静默 resolve，
    // 仅用于捕获调用参数（toHaveBeenCalledWith 仍生效）
    prisma.rolePermission.deleteMany.mockResolvedValue({ count: 0 });
    prisma.rolePermission.createMany.mockResolvedValue(undefined);
    service = buildService(prisma);
  });

  it('7. 普通管理员不能创建超管角色 ROLE_ADMIN → Forbidden，不写库', async () => {
    await expect(
      service.create({ roleCode: 'ROLE_ADMIN', roleName: '伪造超管' }, normalAdmin),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.role.create).not.toHaveBeenCalled();
  });

  it('8. 普通管理员不能创建任何系统角色（ROLE_HEADMASTER）→ Forbidden', async () => {
    await expect(
      service.create({ roleCode: 'ROLE_HEADMASTER', roleName: '伪造班主任' }, normalAdmin),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.role.create).not.toHaveBeenCalled();
  });

  it('9. 非法格式 roleCode → BadRequest', async () => {
    await expect(
      service.create({ roleCode: 'admin', roleName: 'X' }, normalAdmin),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create({ roleCode: 'ROLE_bad', roleName: 'X' }, normalAdmin),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('10. 空角色名称 → BadRequest', async () => {
    await expect(
      service.create({ roleCode: 'ROLE_X', roleName: '   ' }, normalAdmin),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('11. 重复 roleCode → BadRequest（唯一性校验先于写入）', async () => {
    prisma.role.findUnique.mockResolvedValue({ id: 7n }); // 已存在
    await expect(
      service.create({ roleCode: 'ROLE_CLASS_MONITOR', roleName: '班委' }, normalAdmin),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.role.create).not.toHaveBeenCalled();
  });

  it('12. 普通管理员可创建合法的自定义角色 → 成功写库', async () => {
    prisma.role.findUnique.mockResolvedValue(null); // 不存在
    prisma.role.create.mockResolvedValue({
      id: 8n,
      roleCode: 'ROLE_CLASS_MONITOR',
      roleName: '班委',
    });
    const res = await service.create(
      { roleCode: 'ROLE_CLASS_MONITOR', roleName: '  班委  ', description: 'desc' },
      normalAdmin,
    );
    expect(res.roleCode).toBe('ROLE_CLASS_MONITOR');
    expect(prisma.role.create).toHaveBeenCalledWith({
      data: { roleCode: 'ROLE_CLASS_MONITOR', roleName: '班委', description: 'desc' },
    });
  });

  it('13. 超管可创建系统角色 ROLE_ADMIN → 成功写库', async () => {
    prisma.role.findUnique.mockResolvedValue(null);
    prisma.role.create.mockResolvedValue({
      id: 1n,
      roleCode: 'ROLE_ADMIN',
      roleName: '系统管理员',
    });
    const res = await service.create(
      { roleCode: 'ROLE_ADMIN', roleName: '系统管理员' },
      superAdmin,
    );
    expect(res.roleCode).toBe('ROLE_ADMIN');
    expect(prisma.role.create).toHaveBeenCalled();
  });
});
