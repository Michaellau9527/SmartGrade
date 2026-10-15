import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma';
import { PaginationDto } from '@/common/dto';
import { CurrentUserPayload } from '@/common/types';
import { isSystemRole, ROLE_ADMIN, isValidRoleCodeFormat } from '@/common/constants/system-roles';

@Injectable()
export class RoleService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: PaginationDto) {
    const [list, total] = await Promise.all([
      this.prisma.role.findMany({
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.role.count(),
    ]);

    // role.id 为 BigInt，NestJS 默认 JSON 序列化不支持 BigInt。
    // 转成 Number 以便前端在角色分配时回填 roleIds（AssignRolesDto 要求 number[]）。
    return {
      list: list.map((role) => ({ ...role, id: Number(role.id) })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findOne(id: number | string) {
    const role = await this.prisma.role.findUnique({
      where: { id: BigInt(id) },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('角色不存在');
    }

    return role;
  }

  async getRolePermissions(id: number | string) {
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId: BigInt(id) },
      include: { permission: true },
    });

    return rolePermissions.map((rp) => rp.permission);
  }

  /**
   * 创建角色（带系统角色创建保护与基础校验）。
   *
   * 安全约束（修复越权创建系统角色风险）：
   * - 系统角色（SYSTEM_ROLE_CODES，含 ROLE_ADMIN）仅允许 ROLE_ADMIN 创建，
   *   防止普通管理员伪造 ROLE_ADMIN 等提权角色；
   * - roleCode 必须格式合法（以 ROLE_ 开头、仅大写字母/数字/下划线、长度 1–50）
   *   且全局唯一（与 schema 的 @unique 一致）；
   * - 调用者身份来自 @CurrentUser（权威），不依赖请求体声明的身份。
   *
   * @param body 请求体（roleCode / roleName / description）
   * @param user 当前登录用户（来自 @CurrentUser）
   */
  async create(body: any, user: CurrentUserPayload) {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('请求体格式不合法');
    }
    const { roleCode, roleName } = body;

    // 1) 角色名称必填
    if (typeof roleName !== 'string' || roleName.trim().length === 0) {
      throw new BadRequestException('角色名称不能为空');
    }

    // 2) 角色编码格式校验
    if (!isValidRoleCodeFormat(roleCode)) {
      throw new BadRequestException(
        '角色编码格式不合法：须以 ROLE_ 开头，仅含大写字母、数字、下划线，长度 1–50',
      );
    }

    const isSuperAdmin = Array.isArray(user?.roles) && user.roles.includes(ROLE_ADMIN);

    // 3) 系统角色仅允许超级管理员创建，防止伪造提权角色
    if (isSystemRole(roleCode) && !isSuperAdmin) {
      throw new ForbiddenException(`无权创建系统角色（${roleCode}）`);
    }

    // 4) 唯一性校验（与 schema @unique 对齐，提前给出清晰错误而非依赖 DB 异常）
    const existing = await this.prisma.role.findUnique({
      where: { roleCode },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('角色编码已存在');
    }

    return this.prisma.role.create({
      data: {
        roleCode,
        roleName: roleName.trim(),
        description: typeof body.description === 'string' ? body.description : null,
      },
    });
  }

  async update(id: number | string, body: any) {
    return this.prisma.role.update({
      where: { id: BigInt(id) },
      data: {
        roleName: body.roleName,
        description: body.description,
      },
    });
  }

  async remove(id: number | string) {
    await this.prisma.rolePermission.deleteMany({ where: { roleId: BigInt(id) } });
    try {
      await (this.prisma as any).teacherRole.deleteMany({ where: { roleId: BigInt(id) } });
    } catch {
    }
    await this.prisma.role.delete({ where: { id: BigInt(id) } });
    return { success: true };
  }

  /**
   * 分配角色权限（带最小权限隔离与系统角色保护）。
   *
   * 安全约束（修复越权提升风险）：
   * - 系统角色（SYSTEM_ROLE_CODES，含 ROLE_ADMIN 及全部 seed 角色）的权限仅允许
   *   ROLE_ADMIN 自身修改，防止普通管理员篡改系统级角色权限；
   * - 非 ROLE_ADMIN 调用者只能授予「自身已持有」的权限，无法借分配权限实现提权；
   * - ROLE_ADMIN 在权限守卫中短路全放行，其 user.permissions 可能为空，故以 roles 含
   *   ROLE_ADMIN 作为超级管理员直通判断（与 PermissionsGuard / DataScopeGuard 口径一致）。
   *
   * @param roleId        目标角色 id
   * @param permissionIds 待授予的权限 id 列表
   * @param user          当前登录用户（来自 @CurrentUser，权威身份，不依赖请求体）
   */
  async assignPermissions(
    roleId: number | string,
    permissionIds: (number | string)[],
    user: CurrentUserPayload,
  ) {
    // 1) 加载目标角色，确认存在并取 roleCode
    const targetRole = await this.prisma.role.findUnique({
      where: { id: BigInt(roleId) },
      select: { id: true, roleCode: true },
    });
    if (!targetRole) {
      throw new NotFoundException('角色不存在');
    }

    const isSuperAdmin = Array.isArray(user?.roles) && user.roles.includes(ROLE_ADMIN);

    // 2) 系统角色仅允许超级管理员自身修改，防止普通管理员篡改系统级角色权限
    //    （系统角色判定见 @/common/constants/system-roles，Role 模型无 isSystem 字段）
    if (isSystemRole(targetRole.roleCode) && !isSuperAdmin) {
      throw new ForbiddenException(`无权修改系统角色（${targetRole.roleCode}）的权限`);
    }

    // 3) 规范化并去重权限 id，随后校验每个 id 真实存在
    const uniqueIds = Array.from(new Set((permissionIds ?? []).map((p) => BigInt(p))));
    let grantedCodes: string[] = [];
    if (uniqueIds.length > 0) {
      const perms = await this.prisma.permission.findMany({
        where: { id: { in: uniqueIds } },
        select: { id: true, permissionCode: true },
      });
      if (perms.length !== uniqueIds.length) {
        throw new BadRequestException('存在无效的权限 ID');
      }
      grantedCodes = perms.map((p) => p.permissionCode);

      // 4) 最小权限隔离：非超级管理员只能授予自身已持有的权限
      if (!isSuperAdmin) {
        const held = new Set(user?.permissions ?? []);
        const unauthorized = grantedCodes.filter((code) => !held.has(code));
        if (unauthorized.length > 0) {
          throw new ForbiddenException('无权授予超出自身权限范围的权限');
        }
      }
    }

    // 5) 原子替换角色权限（先清空再批量写入）
    await this.prisma.rolePermission.deleteMany({
      where: { roleId: BigInt(roleId) },
    });
    if (uniqueIds.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: uniqueIds.map((pid) => ({
          roleId: BigInt(roleId),
          permissionId: pid,
        })),
      });
    }

    return { success: true };
  }
}
