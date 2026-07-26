import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma';
import { PaginationDto } from '@/common/dto';

@Injectable()
export class TeacherService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: PaginationDto) {
    const [list, total] = await Promise.all([
      this.prisma.teacher.findMany({
        skip: query.skip,
        take: query.take,
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.teacher.count({ where: { deletedAt: null } }),
    ]);

    return { list, total, page: query.page, pageSize: query.pageSize };
  }

  async findOne(id: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      include: {
        headClasses: true,
      },
    });

    if (!teacher || teacher.deletedAt) {
      throw new NotFoundException('教师不存在');
    }

    return teacher;
  }

  async create(body: any) {
    return this.prisma.teacher.create({
      data: {
        teacherNo: body.teacherNo,
        name: body.name,
        gender: body.gender,
        phone: body.phone,
        email: body.email,
        teachingGroup: body.teachingGroup,
        position: body.position,
        status: body.status ?? 'ACTIVE',
      },
    });
  }

  async update(id: string, body: any) {
    return this.prisma.teacher.update({
      where: { id },
      data: {
        name: body.name,
        gender: body.gender,
        phone: body.phone,
        email: body.email,
        avatar: body.avatar,
        teachingGroup: body.teachingGroup,
        position: body.position,
        status: body.status,
      },
    });
  }

  async remove(id: string) {
    await this.prisma.teacher.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'RESIGNED' },
    });
    return { success: true };
  }

  async assignRoles(teacherId: string, roleIds: (number | string)[]) {
    try {
      await (this.prisma as any).teacherRole.deleteMany({
        where: { teacherId: teacherId },
      });

      if (roleIds && roleIds.length > 0) {
        await (this.prisma as any).teacherRole.createMany({
          data: roleIds.map((rid) => ({
            teacherId: teacherId,
            roleId: BigInt(rid),
          })),
        });
      }
    } catch {
    }

    return { success: true };
  }

  async assignTags(teacherId: string, tagIds: (number | string)[]) {
    try {
      await (this.prisma as any).teacherTag.deleteMany({
        where: { teacherId: teacherId },
      });

      if (tagIds && tagIds.length > 0) {
        await (this.prisma as any).teacherTag.createMany({
          data: tagIds.map((tid) => ({
            teacherId: teacherId,
            tagId: BigInt(tid),
          })),
        });
      }
    } catch {
    }

    return { success: true };
  }
}
