import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { compare } from 'bcryptjs';
import { PrismaService } from '@/common/prisma';
import { getPermissions } from '@/authorization/role-permission.map';
import { RoleCode } from '@smartgrade/shared/enums/RoleCode';
import { WechatCodeExchangeService } from './wechat-code-exchange.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
    private wechatCodeExchange: WechatCodeExchangeService,
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

    // 微信 code → openid（P1-13 Gate C：统一由 WechatCodeExchangeService 换码，
    // 登录与教师微信绑定共用同一实现；此处只取 openid，unionid 在绑定时写入）
    const { openid } = await this.wechatCodeExchange.exchange(code);

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

  /**
   * 管理员账号密码冷启动登录（P1-13 运维配套）
   *
   * 设计边界（严格，不扩大）：
   * - 仅 admin（Teacher.teacher_role 含 ROLE_ADMIN）可登入；普通教师/年级主任/政教不在白名单
   * - 仅消费 seed.ts bootstrap 模式预置的 UserIdentity(provider='ACCOUNT') 行
   * - 失败统一抛 UnauthorizedException('用户名或密码错误')，不区分原因
   * - 不复用 loginByWechat，仅复用本服务内部的 generateTokens / loadTeacherRoles / loadPermissionsByRoles
   *   ——保持"不复制 JWT 生成代码"的约束
   *
   * 校验链（任一失败 → 同一 401）：
   *  1. username / password 非空
   *  2. User.username 命中且 User.status='ACTIVE'
   *  3. UserIdentity(provider='ACCOUNT', userId=user.id, status='ACTIVE', credentialHash 非空) 存在
   *  4. bcrypt.compare(password, credentialHash) 通过
   *  5. User.teacherId 非空
   *  6. Teacher.status='ACTIVE'
   *  7. teacher_role（含显式 teacher_role 表 join）必须含 ROLE_ADMIN
   */
  async loginByPassword(username: string, password: string) {
    if (!username || !password) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 1. User.username 命中（不直接查 UserIdentity，避免外部输入成为主键入口）
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 2. 该 user 下 provider=ACCOUNT 的 ACTIVE identity
    const identity = await this.prisma.userIdentity.findFirst({
      where: {
        userId: user.id,
        provider: 'ACCOUNT',
        status: 'ACTIVE',
      },
    });

    // 3. credentialHash bcrypt 校验
    if (
      !identity ||
      !identity.credentialHash ||
      !(await compare(password, identity.credentialHash))
    ) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 4. User.teacherId 非空
    if (!user.teacherId) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 5. Teacher ACTIVE
    const teacher = await this.prisma.teacher.findUnique({ where: { id: user.teacherId } });
    if (!teacher || teacher.status !== 'ACTIVE') {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 6. 必须含 ROLE_ADMIN（复用现有 loadTeacherRoles）
    const roles = await this.loadTeacherRoles(teacher.id, teacher.teacherNo);
    if (!roles.includes('ROLE_ADMIN')) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 7. 复用现有 generateTokens（与微信登录同 payload：{sub,teacherNo,name}）
    const tokens = await this.generateTokens(teacher);
    const permissions = await this.loadPermissionsByRoles(roles);

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
