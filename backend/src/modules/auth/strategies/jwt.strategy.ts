import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma';
import { CurrentUserPayload, DataScope } from '@/common/types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any): Promise<CurrentUserPayload> {
    const teacherId = payload.sub;

    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
      select: {
        id: true,
        teacherNo: true,
        name: true,
        status: true,
      },
    });

    if (!teacher || teacher.status !== 'ACTIVE') {
      throw new UnauthorizedException('用户不存在或已被禁用');
    }

    // 从 teacher_role 表加载角色
    const roles = await this.loadTeacherRoles(teacherId);

    // 从角色关联加载权限
    const permissions = await this.loadPermissionsByRoles(roles);

    const dataScope = await this.calculateDataScope(teacherId, roles);

    return {
      id: teacher.id as unknown as number,
      teacherNo: teacher.teacherNo,
      name: teacher.name,
      roles,
      permissions,
      dataScope,
    } as CurrentUserPayload;
  }

  private async getPermissions(roleIds: bigint[]): Promise<string[]> {
    if (roleIds.length === 0) return [];

    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId: { in: roleIds } },
      include: {
        permission: {
          select: { permissionCode: true },
        },
      },
    });

    return [...new Set(rolePermissions.map((rp) => rp.permission.permissionCode))];
  }

  private async calculateDataScope(teacherId: string, roles: string[]): Promise<DataScope> {
    if (roles.includes('ROLE_ADMIN') || roles.includes('ROLE_POLITICAL')) {
      return { type: 'ALL' };
    }

    if (roles.includes('ROLE_GRADE_DIRECTOR')) {
      const grade = await this.prisma.grade.findFirst({
        where: { directorId: teacherId },
        select: { id: true },
      });
      if (grade) return { type: 'GRADE', gradeId: Number(grade.id) };
    }

    if (roles.includes('ROLE_HEADMASTER')) {
      const cls = await this.prisma.class.findFirst({
        where: { headTeacherId: teacherId },
        select: { id: true, gradeId: true },
      });
      if (cls) {
        return { type: 'CLASS', classId: Number(cls.id), gradeId: Number(cls.gradeId) };
      }
    }

    if (roles.includes('ROLE_DORM_MANAGER')) {
      return { type: 'DORM' };
    }

    return { type: 'SELF' };
  }

  private async loadTeacherRoles(teacherId: string): Promise<string[]> {
    try {
      const results = await this.prisma.$queryRawUnsafe<
        Array<{ role_code: string }>
      >(
        `SELECT r.role_code FROM teacher_role tr
         JOIN role r ON tr.role_id = r.id
         WHERE tr.teacher_id = '${teacherId}'`,
      );
      return results.map((r) => r.role_code);
    } catch {
      return [];
    }
  }

  private async loadPermissionsByRoles(roles: string[]): Promise<string[]> {
    if (roles.length === 0) return [];
    try {
      const placeholders = roles.map(() => `?`).join(',');
      const results = await this.prisma.$queryRawUnsafe<
        Array<{ permission_code: string }>
      >(
        `SELECT DISTINCT p.permission_code FROM role_permission rp
         JOIN permission p ON rp.permission_id = p.id
         JOIN role r ON rp.role_id = r.id
         WHERE r.role_code IN (${placeholders})`,
        ...roles,
      );
      return results.map((r) => r.permission_code);
    } catch {
      return [];
    }
  }
}
