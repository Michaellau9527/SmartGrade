import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma';
import { CurrentUserPayload, DataScope } from '@/common/types';

/**
 * JwtStrategy - JWT 验证策略
 *
 * 每次请求时执行：
 * 1. 从 Header 提取 Bearer Token
 * 2. 验证 Token 签名和过期时间
 * 3. 查询数据库加载教师完整信息
 * 4. 加载角色列表
 * 5. 加载权限列表
 * 6. 计算数据范围
 */
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
        teacher_no: true,
        name: true,
        status: true,
      },
    });

    if (!teacher || !teacher.status) {
      throw new UnauthorizedException('用户不存在或已被禁用');
    }

    // 查询角色列表
    const teacherRoles = await this.prisma.teacherRole.findMany({
      where: { teacher_id: teacherId },
      include: {
        role: {
          select: { role_code: true },
        },
      },
    });
    const roles = teacherRoles.map((tr) => tr.role.role_code);

    // 查询权限列表（通过角色关联）
    const roleIds = teacherRoles.map((tr) => tr.role_id);
    const permissions = await this.getPermissions(roleIds);

    // 计算数据范围
    const dataScope = await this.calculateDataScope(teacherId, roles);

    return {
      id: Number(teacher.id),
      teacherNo: teacher.teacher_no,
      name: teacher.name,
      roles,
      permissions,
      dataScope,
    };
  }

  private async getPermissions(roleIds: bigint[]): Promise<string[]> {
    if (roleIds.length === 0) return [];

    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { role_id: { in: roleIds } },
      include: {
        permission: {
          select: { permission_code: true },
        },
      },
    });

    return [...new Set(rolePermissions.map((rp) => rp.permission.permission_code))];
  }

  /**
   * 计算数据范围
   *
   * 规则与 DataScopeGuard.calculateDataScope 一致
   * 多角色取最大范围
   */
  private async calculateDataScope(teacherId: number, roles: string[]): Promise<DataScope> {
    // 1. 管理员 / 政教：全校
    if (roles.includes('ROLE_ADMIN') || roles.includes('ROLE_POLITICAL')) {
      return { type: 'ALL' };
    }

    // 2. 年级主任：本年级
    if (roles.includes('ROLE_GRADE_DIRECTOR')) {
      const grade = await this.prisma.grade.findFirst({
        where: { director_teacher_id: teacherId },
        select: { id: true },
      });
      if (grade) return { type: 'GRADE', gradeId: Number(grade.id) };
    }

    // 3. 班主任：本班
    if (roles.includes('ROLE_HEADMASTER')) {
      const cls = await this.prisma.class.findFirst({
        where: { head_teacher_id: teacherId },
        select: { id: true, grade_id: true },
      });
      if (cls) {
        return { type: 'CLASS', classId: Number(cls.id), gradeId: Number(cls.grade_id) };
      }
    }

    // 4. 宿管：住宿生
    if (roles.includes('ROLE_DORM_MANAGER')) {
      return { type: 'DORM' };
    }

    // 5. 任课教师 / 默认：仅个人（预留授课班级扩展）
    return { type: 'SELF' };
  }
}
