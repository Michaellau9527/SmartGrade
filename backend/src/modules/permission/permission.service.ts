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
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.permission.count(),
    ]);

    return { list, total, page: query.page, pageSize: query.pageSize };
  }

  async findOne(id: number) {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException('权限不存在');
    }

    return permission;
  }

  async create(body: any) {
    return this.prisma.permission.create({
      data: {
        permission_code: body.permissionCode,
        permission_name: body.permissionName,
        resource: body.resource,
        action: body.action,
        description: body.description,
      },
    });
  }

  async update(id: number, body: any) {
    return this.prisma.permission.update({
      where: { id },
      data: {
        permission_name: body.permissionName,
        resource: body.resource,
        action: body.action,
        description: body.description,
      },
    });
  }

  async remove(id: number) {
    await this.prisma.rolePermission.deleteMany({ where: { permission_id: id } });
    await this.prisma.permission.delete({ where: { id } });
    return { success: true };
  }
}
