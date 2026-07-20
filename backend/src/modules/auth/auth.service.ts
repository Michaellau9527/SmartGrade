import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma';

/**
 * AuthService - 认证服务
 *
 * 职责：
 * - 登录验证（模拟登录 / 微信登录）
 * - Token 生成与刷新
 * - 当前用户信息查询
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  /**
   * 模拟登录（开发测试用）
   *
   * 通过教师工号查找用户，生成 JWT Token
   */
  async mockLogin(teacherNo: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { teacher_no: teacherNo },
      include: {
        roles: {
          include: { role: true },
        },
        tags: {
          include: { tag: true },
        },
      },
    });

    if (!teacher) {
      throw new UnauthorizedException('教师工号不存在');
    }

    if (!teacher.status) {
      throw new UnauthorizedException('账号已被禁用');
    }

    const tokens = await this.generateTokens(teacher);

    return {
      teacher: {
        id: Number(teacher.id),
        teacherNo: teacher.teacher_no,
        name: teacher.name,
        gender: teacher.gender,
        avatar: teacher.avatar,
        department: teacher.department,
        position: teacher.position,
      },
      roles: teacher.roles.map((tr) => ({
        id: Number(tr.role.id),
        code: tr.role.role_code,
        name: tr.role.role_name,
      })),
      tags: teacher.tags.map((tt) => ({
        id: Number(tt.tag.id),
        code: tt.tag.tag_code,
        name: tt.tag.tag_name,
      })),
      ...tokens,
    };
  }

  /**
   * 刷新 Token
   */
  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const teacher = await this.prisma.teacher.findUnique({
        where: { id: payload.sub },
      });

      if (!teacher || !teacher.status) {
        throw new UnauthorizedException('用户不存在或已被禁用');
      }

      return this.generateTokens(teacher);
    } catch {
      throw new UnauthorizedException('Refresh Token 无效或已过期');
    }
  }

  /**
   * 退出登录
   */
  async logout(_teacherId: number) {
    // TODO: 如有 Redis 缓存，清除用户登录态
    return { success: true };
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(teacherId: number) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
      include: {
        roles: {
          include: { role: true },
        },
        tags: {
          include: { tag: true },
        },
      },
    });

    if (!teacher) {
      throw new UnauthorizedException('用户不存在');
    }

    // 查询权限列表
    const roleIds = teacher.roles.map((tr) => tr.role_id);
    const permissions = await this.getPermissionList(roleIds);

    return {
      id: Number(teacher.id),
      teacherNo: teacher.teacher_no,
      name: teacher.name,
      gender: teacher.gender,
      avatar: teacher.avatar,
      department: teacher.department,
      position: teacher.position,
      roles: teacher.roles.map((tr) => tr.role.role_code),
      tags: teacher.tags.map((tt) => tt.tag.tag_code),
      permissions,
    };
  }

  /**
   * 生成 JWT Access Token + Refresh Token
   */
  private async generateTokens(teacher: any) {
    const payload = {
      sub: Number(teacher.id),
      teacherNo: teacher.teacher_no,
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

  /**
   * 获取角色的权限编码列表
   */
  private async getPermissionList(roleIds: bigint[]): Promise<string[]> {
    if (roleIds.length === 0) return [];

    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { role_id: { in: roleIds } },
      include: {
        permission: { select: { permission_code: true } },
      },
    });

    return [...new Set(rolePermissions.map((rp) => rp.permission.permission_code))];
  }
}
