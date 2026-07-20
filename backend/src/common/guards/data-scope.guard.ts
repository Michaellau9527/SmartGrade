import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma';
import { DATA_SCOPE_KEY } from '../decorators';
import { CurrentUserPayload, DataScope } from '../types';

/**
 * DataScopeGuard - 数据权限守卫
 *
 * 根据用户角色自动计算数据范围，附加到 request.user.dataScope
 *
 * 数据范围规则（docs/10-Permission.md 第七章）：
 * - ROLE_ADMIN：ALL（全校）
 * - ROLE_POLITICAL：ALL（全校）
 * - ROLE_GRADE_DIRECTOR：GRADE（本年级）
 * - ROLE_HEADMASTER：CLASS（本班）
 * - ROLE_DORM_MANAGER：DORM（住宿生）
 * - ROLE_SUBJECT_TEACHER：SELF（仅个人，预留授课班级扩展）
 *
 * 执行位置：全局 Guard 链末尾
 * 执行顺序：ThrottlerGuard → JwtAuthGuard → RolesGuard → PermissionsGuard → DataScopeGuard
 */
@Injectable()
export class DataScopeGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const needDataScope = this.reflector.getAllAndOverride<boolean>(DATA_SCOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 未标记 @DataScope() 的接口不计算数据范围
    if (!needDataScope) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as CurrentUserPayload;

    if (!user) {
      return true;
    }

    const dataScope = await this.calculateDataScope(user);
    user.dataScope = dataScope;

    return true;
  }

  /**
   * 根据角色计算数据范围
   *
   * 角色优先级：ADMIN > POLITICAL > GRADE_DIRECTOR > HEADMASTER > DORM_MANAGER > SUBJECT_TEACHER
   * 多角色取最大范围
   */
  private async calculateDataScope(user: CurrentUserPayload): Promise<DataScope> {
    const roles = user.roles || [];

    // 1. 管理员 / 政教：全校
    if (roles.includes('ROLE_ADMIN') || roles.includes('ROLE_POLITICAL')) {
      return { type: 'ALL' };
    }

    // 2. 年级主任：查询管理的年级
    if (roles.includes('ROLE_GRADE_DIRECTOR')) {
      const grade = await this.prisma.grade.findFirst({
        where: { director_teacher_id: user.id },
        select: { id: true },
      });
      if (grade) {
        return { type: 'GRADE', gradeId: Number(grade.id) };
      }
    }

    // 3. 班主任：查询管理的班级
    if (roles.includes('ROLE_HEADMASTER')) {
      const cls = await this.prisma.class.findFirst({
        where: { head_teacher_id: user.id },
        select: { id: true, grade_id: true },
      });
      if (cls) {
        return {
          type: 'CLASS',
          classId: Number(cls.id),
          gradeId: Number(cls.grade_id),
        };
      }
    }

    // 4. 宿管：住宿生范围
    if (roles.includes('ROLE_DORM_MANAGER')) {
      return { type: 'DORM' };
    }

    // 5. 任课教师：仅个人数据
    //    预留扩展：未来可通过授课关系表查询授课班级，返回 classIds 列表
    if (roles.includes('ROLE_SUBJECT_TEACHER')) {
      return { type: 'SELF' };
    }

    // 默认：无角色时仅个人数据
    return { type: 'SELF' };
  }
}
