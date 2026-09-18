import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma';
import { PaginationDto } from '@/common/dto';

@Injectable()
export class PermissionService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: PaginationDto) {
    const [list, total] = await Promise.all([
      this.prisma.permission.findMany({
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.permission.count(),
    ]);

    return { list, total, page: query.page, pageSize: query.pageSize };
  }

  async findOne(id: number | string) {
    const permission = await this.prisma.permission.findUnique({
      where: { id: BigInt(id) },
    });

    if (!permission) {
      throw new NotFoundException('权限不存在');
    }

    return permission;
  }

  async create(body: any) {
    return this.prisma.permission.create({
      data: {
        permissionCode: body.permissionCode,
        permissionName: body.permissionName,
        resource: body.resource,
        action: body.action,
        description: body.description,
      },
    });
  }

  async update(id: number | string, body: any) {
    return this.prisma.permission.update({
      where: { id: BigInt(id) },
      data: {
        permissionName: body.permissionName,
        resource: body.resource,
        action: body.action,
        description: body.description,
      },
    });
  }

  async remove(id: number | string) {
    await this.prisma.rolePermission.deleteMany({ where: { permissionId: BigInt(id) } });
    await this.prisma.permission.delete({ where: { id: BigInt(id) } });
    return { success: true };
  }
}
