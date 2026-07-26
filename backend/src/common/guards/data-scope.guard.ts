import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma';
import { DATA_SCOPE_KEY } from '../decorators';
import { CurrentUserPayload, DataScope } from '../types';

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

  private async calculateDataScope(user: CurrentUserPayload): Promise<DataScope> {
    const roles = user.roles || [];

    if (roles.includes('ROLE_ADMIN') || roles.includes('ROLE_POLITICAL')) {
      return { type: 'ALL' };
    }

    if (roles.includes('ROLE_GRADE_DIRECTOR')) {
      const grade = await this.prisma.grade.findFirst({
        where: { directorId: String(user.id) },
        select: { id: true },
      });
      if (grade) {
        return { type: 'GRADE', gradeId: Number(grade.id) };
      }
    }

    if (roles.includes('ROLE_HEADMASTER')) {
      const cls = await this.prisma.class.findFirst({
        where: { headTeacherId: String(user.id) },
        select: { id: true, gradeId: true },
      });
      if (cls) {
        return {
          type: 'CLASS',
          classId: Number(cls.id),
          gradeId: Number(cls.gradeId),
        };
      }
    }

    if (roles.includes('ROLE_DORM_MANAGER')) {
      return { type: 'DORM' };
    }

    if (roles.includes('ROLE_SUBJECT_TEACHER')) {
      return { type: 'SELF' };
    }

    return { type: 'SELF' };
  }
}
