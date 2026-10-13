import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma';
import { CurrentUserPayload, DataScope } from '@/common/types';
import { getPermissions } from '@/authorization/role-permission.map';
import { RoleCode } from '@smartgrade/shared/enums/RoleCode';

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

    // 从 teacher_role 表加载角色（含工号兜底）
    const roles = await this.loadTeacherRoles(teacherId, teacher.teacherNo);

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
      if (grade) return { type: 'GRADE', gradeId: grade.id };
    }

    if (roles.includes('ROLE_HEADMASTER')) {
      const cls = await this.prisma.class.findFirst({
        where: { headTeacherId: teacherId },
        select: { id: true, gradeId: true },
      });
      if (cls) {
        return { type: 'CLASS', classId: cls.id, gradeId: cls.gradeId };
      }
    }

    if (roles.includes('ROLE_DORM_MANAGER')) {
      return { type: 'DORM' };
    }

    return { type: 'SELF' };
  }

  private async loadTeacherRoles(teacherId: string, _teacherNo: string): Promise<string[]> {
    try {
      // 参数化查询（杜绝 SQL 注入，teacherId 来自 JWT 负载）
      const results = await this.prisma.$queryRaw<
        Array<{ role_code: string }>
      >`
        SELECT r.role_code FROM teacher_role tr
        JOIN role r ON tr.role_id = r.id
        WHERE tr.teacher_id = ${teacherId}
      `;
      const roles = results.map((r) => r.role_code);
      if (roles.length > 0) return roles;
    } catch {
      // teacher_role 查询异常：拒绝默认授权（deny by default），绝不回退到工号硬编码角色
    }
    // 无任何角色：返回空（数据范围回落到 SELF，权限为空）— 安全默认
    return [];
  }

  private async loadPermissionsByRoles(roles: string[]): Promise<string[]> {
    if (roles.length === 0) return [];
    try {
      const roleRecords = await this.prisma.role.findMany({
        where: { roleCode: { in: roles } },
        include: {
          permissions: {
            include: {
              permission: { select: { permissionCode: true } },
            },
          },
        },
      });
      const codes = new Set<string>();
      for (const role of roleRecords) {
        for (const rp of role.permissions) {
          if (rp.permission?.permissionCode) {
            codes.add(rp.permission.permissionCode);
          }
        }
      }
      if (codes.size > 0) return [...codes];
    } catch (error) {
      // 保留原有的异常捕获与 fallback 逻辑
      console.error('Failed to load permissions by roles:', error);
    }
    return [];
  }
}
