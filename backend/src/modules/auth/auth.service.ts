import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma';

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async mockLogin(teacherNo: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { teacherNo: teacherNo },
    });

    if (!teacher) {
      throw new UnauthorizedException('教师工号不存在');
    }

    if (teacher.status !== 'ACTIVE') {
      throw new UnauthorizedException('账号已被禁用');
    }

    const roles = await this.loadTeacherRoles(teacher.id);
    const permissions = await this.loadPermissionsByRoles(roles);

    const tokens = await this.generateTokens(teacher);

    return {
      teacher: {
        id: teacher.id,
        teacherNo: teacher.teacherNo,
        name: teacher.name,
        gender: teacher.gender,
        avatar: teacher.avatar,
        position: teacher.position,
      },
      roles,
      permissions,
      tags: [],
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const teacher = await this.prisma.teacher.findUnique({
        where: { id: payload.sub },
      });

      if (!teacher || teacher.status !== 'ACTIVE') {
        throw new UnauthorizedException('用户不存在或已被禁用');
      }

      return this.generateTokens(teacher);
    } catch {
      throw new UnauthorizedException('Refresh Token 无效或已过期');
    }
  }

  async logout(_teacherId: string) {
    return { success: true };
  }

  async getCurrentUser(teacherId: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) {
      throw new UnauthorizedException('用户不存在');
    }

    const roles = await this.loadTeacherRoles(teacherId);
    const permissions = await this.loadPermissionsByRoles(roles);

    return {
      id: teacher.id,
      teacherNo: teacher.teacherNo,
      name: teacher.name,
      gender: teacher.gender,
      avatar: teacher.avatar,
      position: teacher.position,
      roles,
      tags: [],
      permissions,
    };
  }

  private async generateTokens(teacher: any) {
    const payload = {
      sub: teacher.id,
      teacherNo: teacher.teacherNo,
      name: teacher.name,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '7d'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '30d',
    });

    return {
      token: accessToken,
      refreshToken,
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '7d'),
    };
  }

  private async getPermissionList(roleIds: bigint[]): Promise<string[]> {
    if (roleIds.length === 0) return [];

    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId: { in: roleIds } },
      include: {
        permission: { select: { permissionCode: true } },
      },
    });

    return [...new Set(rolePermissions.map((rp) => rp.permission.permissionCode))];
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
