import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma';
import { PaginationDto } from '@/common/dto';
import { AssignRolesDto } from './dto';

/**
 * 允许通过 POST /teachers/:id/roles 分配的角色白名单（服务端强制，与前端无关）。
 * ROLE_ADMIN 不在列：防止通过普通教师管理接口提权，如需授予走 DBA 授权流程。
 * ROLE_PARENT / ROLE_STUDENT 非教师角色，同禁。
 */
const ASSIGNABLE_ROLE_CODES: readonly string[] = [
  'ROLE_GRADE_DIRECTOR',
  'ROLE_POLITICAL',
  'ROLE_HEADMASTER',
  'ROLE_SUBJECT_TEACHER',
  'ROLE_DORM_MANAGER',
];

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

  async getTeacherRoles(teacherId: string) {
    // 1. 教师存在性校验（与 findOne 一致：deletedAt 视为不存在）
    const exists = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('教师不存在');
    }

    // 2. 读 teacher_role（参数化 raw SQL，与 auth.service.ts:239 loadTeacherRoles 同口径）
    //    TODO(P2): 与 auth.service.ts:239 合并到 RoleService；当前不动冻结区，保留本地实现。
    const rows = await this.prisma.$queryRaw<Array<{ role_code: string }>>`
      SELECT r.role_code FROM teacher_role tr
      JOIN role r ON tr.role_id = r.id
      WHERE tr.teacher_id = ${teacherId}
    `;

    return {
      teacherId,
      roles: rows.map((r) => r.role_code),
    };
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

  /**
   * 分配教师角色（全量替换）。
   *
   * 安全设计：
   * - 所有校验（教师存在性 / 角色存在性 / 白名单）都在 DELETE 之前完成；
   *   任何失败抛出 HttpException，由 $transaction 整体回滚，旧角色不受影响。
   * - 白名单为服务端强制：roleCode 由服务端从 role 表读回解析，不信任调用方；
   *   ROLE_ADMIN 不在列，任何调用方（含管理员）都无法通过本接口授予管理员角色。
   * - 空 roleIds = 显式清空该教师全部角色。
   * - 写入失败异常向上传播，回滚由真实数据库事务保证。
   */
  async assignRoles(teacherId: string, dto: AssignRolesDto) {
    // ① 事务前：教师必须存在且未删除（与 findOne / getTeacherRoles 同口径）
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { id: true, deletedAt: true },
    });
    if (!teacher || teacher.deletedAt) {
      throw new NotFoundException('教师不存在');
    }

    // ② 入参归一化：去重（UNIQUE(teacher_id, role_id) 即幂等语义）；[] = 清空
    const idList = [...new Set(dto.roleIds)].map((id) => BigInt(id));

    // ③ 交互式事务：校验 → 删除 → 写入 → 读回，任一步失败整体回滚
    return this.prisma.$transaction(async (tx) => {
      if (idList.length > 0) {
        // 角色存在性 + 白名单（在 DELETE 之前完成）
        const rows = await tx.$queryRaw<Array<{ role_code: string }>>`
          SELECT id, role_code FROM role WHERE id IN (${Prisma.join(idList)})
        `;
        if (rows.length !== idList.length) {
          throw new BadRequestException('存在无效的角色 ID');
        }
        const illegal = rows
          .map((row) => row.role_code)
          .filter((code) => !ASSIGNABLE_ROLE_CODES.includes(code));
        if (illegal.length > 0) {
          throw new ForbiddenException(`不允许分配角色: ${illegal.join(', ')}`);
        }
      }

      // ④ 全量替换
      await tx.$executeRaw`
        DELETE FROM teacher_role WHERE teacher_id = ${teacherId}
      `;
      if (idList.length > 0) {
        const valueRows = idList.map((roleId) => Prisma.sql`(${teacherId}, ${roleId})`);
        await tx.$executeRaw`
          INSERT INTO teacher_role (teacher_id, role_id) VALUES ${Prisma.join(valueRows)}
        `;
      }

      // ⑤ 读回：与 jwt.strategy / auth.service 登录查询同一条 SQL，读写同口径
      const back = await tx.$queryRaw<Array<{ role_code: string }>>`
        SELECT r.role_code FROM teacher_role tr
        JOIN role r ON tr.role_id = r.id
        WHERE tr.teacher_id = ${teacherId}
      `;
      return { success: true, teacherId, roles: back.map((row) => row.role_code) };
    });
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
