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
        where: { deleted_at: null },
        orderBy: { created_at: 'desc' },
        include: {
          roles: { include: { role: true } },
          tags: { include: { tag: true } },
        },
      }),
      this.prisma.teacher.count({ where: { deleted_at: null } }),
    ]);

    return { list, total, page: query.page, pageSize: query.pageSize };
  }

  async findOne(id: number) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      include: {
        roles: { include: { role: true } },
        tags: { include: { tag: true } },
        head_class: true,
      },
    });

    if (!teacher || teacher.deleted_at) {
      throw new NotFoundException('教师不存在');
    }

    return teacher;
  }

  async create(body: any) {
    return this.prisma.teacher.create({
      data: {
        teacher_no: body.teacherNo,
        name: body.name,
        gender: body.gender,
        phone: body.phone,
        email: body.email,
        department: body.department,
        position: body.position,
        status: body.status ?? true,
      },
    });
  }

  async update(id: number, body: any) {
    return this.prisma.teacher.update({
      where: { id },
      data: {
        name: body.name,
        gender: body.gender,
        phone: body.phone,
        email: body.email,
        avatar: body.avatar,
        department: body.department,
        position: body.position,
        status: body.status,
      },
    });
  }

  async remove(id: number) {
    // 逻辑删除
    await this.prisma.teacher.update({
      where: { id },
      data: { deleted_at: new Date(), status: false },
    });
    return { success: true };
  }

  // ========== 角色/标签分配 ==========

  async assignRoles(teacherId: number, roleIds: number[]) {
    // 先删除旧角色
    await this.prisma.teacherRole.deleteMany({
      where: { teacher_id: teacherId },
    });

    // 添加新角色
    if (roleIds && roleIds.length > 0) {
      await this.prisma.teacherRole.createMany({
        data: roleIds.map((rid) => ({
          teacher_id: teacherId,
          role_id: rid,
        })),
      });
    }

    return { success: true };
  }

  async assignTags(teacherId: number, tagIds: number[]) {
    // 先删除旧标签
    await this.prisma.teacherTag.deleteMany({
      where: { teacher_id: teacherId },
    });

    // 添加新标签
    if (tagIds && tagIds.length > 0) {
      await this.prisma.teacherTag.createMany({
        data: tagIds.map((tid) => ({
          teacher_id: teacherId,
          tag_id: tid,
        })),
      });
    }

    return { success: true };
  }
}
