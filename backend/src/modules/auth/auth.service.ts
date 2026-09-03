import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma';
import { getPermissions } from '@/authorization/role-permission.map';
import { RoleCode } from '@smartgrade/shared/enums/RoleCode';

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  /**
   * 真实微信登录链路：
   *   1. 小程序 wx.login() 拿到临时 code
   *   2. 后端用 code 调微信 jscode2session 换取 openid
   *   3. 用 openid 匹配已绑定教师（teacher.wechat_openid）
   *   4. 命中则签发 JWT；未命中明确报错，绝不自动建号（防止任意微信账号冒充教师）
   */
  async loginByWechat(code: string) {
    if (!code) {
      throw new UnauthorizedException('缺少微信登录 code');
    }

    const openid = await this.exchangeWechatOpenid(code);

    const teacher = await this.prisma.teacher.findUnique({
      where: { wechatOpenid: openid },
    });

    if (!teacher) {
      throw new UnauthorizedException('该微信账号未绑定教师账号，请联系学校管理员完成绑定');
    }

    if (teacher.status !== 'ACTIVE') {
      throw new UnauthorizedException('账号已被禁用');
    }

    const roles = await this.loadTeacherRoles(teacher.id, teacher.teacherNo);
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

  /** 调微信 jscode2session 换取 openid / unionid */
  private async exchangeWechatOpenid(code: string): Promise<string> {
    const appid = this.configService.get<string>('WECHAT_APPID');
    const secret = this.configService.get<string>('WECHAT_SECRET');

    if (!appid || !secret) {
      this.logger.error('微信登录未配置 WECHAT_APPID / WECHAT_SECRET');
      throw new UnauthorizedException('微信登录未配置');
    }

    const url =
      `https://api.weixin.qq.com/sns/jscode2session` +
      `?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;

    let data: { openid?: string; unionid?: string; errcode?: number; errmsg?: string };
    try {
      const resp = await fetch(url);
      data = (await resp.json()) as typeof data;
    } catch (err) {
      this.logger.error(`微信 jscode2session 请求失败: ${String(err)}`);
      throw new UnauthorizedException('微信登录服务暂不可用');
    }

    if (data.errcode) {
      this.logger.error(`微信 jscode2session 失败: ${data.errcode} ${data.errmsg}`);
      throw new UnauthorizedException('微信登录校验失败');
    }
    if (!data.openid) {
      throw new UnauthorizedException('微信登录未返回 openid');
    }
    return data.openid;
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

    const roles = await this.loadTeacherRoles(teacherId, teacher.teacherNo);
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
    // 无任何角色：返回空（权限为空）— 安全默认
    return [];
  }

  private async loadPermissionsByRoles(roles: string[]): Promise<string[]> {
    if (roles.length === 0) return [];
    try {
      // 参数化查询（Prisma 模板自动展开数组，杜绝 SQL 注入）
      const results = await this.prisma.$queryRaw<
        Array<{ permission_code: string }>
      >`
        SELECT DISTINCT p.permission_code FROM role_permission rp
        JOIN permission p ON rp.permission_id = p.id
        JOIN role r ON rp.role_id = r.id
        WHERE r.role_code IN (${roles})
      `;
      const perms = results.map((r) => r.permission_code);
      if (perms.length > 0) return perms;
    } catch {
      // role_permission 查询异常：从内存映射加载权限作为兜底（非角色兜底）
    }
    const allPerms = new Set<string>();
    for (const role of roles) {
      const roleCode = role as RoleCode;
      getPermissions(roleCode).forEach((p) => allPerms.add(p as string));
    }
    return [...allPerms];
  }
}
