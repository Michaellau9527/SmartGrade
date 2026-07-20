import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma';
import { PaginationDto } from '@/common/dto';

@Injectable()
export class RoleService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: PaginationDto) {
    const [list, total] = await Promise.all([
      this.prisma.role.findMany({
        skip: query.skip,
        take: query.take,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.role.count(),
    ]);

    return { list, total, page: query.page, pageSize: query.pageSize };
  }

  async findOne(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
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

  async getRolePermissions(id: number) {
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { role_id: id },
      include: { permission: true },
    });

    return rolePermissions.map((rp) => rp.permission);
  }

  async create(body: any) {
    return this.prisma.role.create({
      data: {
        role_code: body.roleCode,
        role_name: body.roleName,
        description: body.description,
      },
    });
  }

  async update(id: number, body: any) {
    return this.prisma.role.update({
      where: { id },
      data: {
        role_name: body.roleName,
        description: body.description,
      },
    });
  }

  async remove(id: number) {
    await this.prisma.rolePermission.deleteMany({ where: { role_id: id } });
    await this.prisma.teacherRole.deleteMany({ where: { role_id: id } });
    await this.prisma.role.delete({ where: { id } });
    return { success: true };
  }

  async assignPermissions(roleId: number, permissionIds: number[]) {
    // 先删除旧权限
    await this.prisma.rolePermission.deleteMany({
      where: { role_id: roleId },
    });

    // 添加新权限
    if (permissionIds && permissionIds.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: permissionIds.map((pid) => ({
          role_id: roleId,
          permission_id: pid,
        })),
      });
    }

    return { success: true };
  }
}
