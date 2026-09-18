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
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.role.count(),
    ]);

    return { list, total, page: query.page, pageSize: query.pageSize };
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

  async create(body: any) {
    return this.prisma.role.create({
      data: {
        roleCode: body.roleCode,
        roleName: body.roleName,
        description: body.description,
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

  async assignPermissions(roleId: number | string, permissionIds: (number | string)[]) {
    await this.prisma.rolePermission.deleteMany({
      where: { roleId: BigInt(roleId) },
    });

    if (permissionIds && permissionIds.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: permissionIds.map((pid) => ({
          roleId: BigInt(roleId),
          permissionId: BigInt(pid),
        })),
      });
    }

    return { success: true };
  }
}
