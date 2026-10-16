import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma';
import { CurrentUserPayload, DataScope } from '@/common/types';
import { ClassQueryDto } from './dto/class-query.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';

/** 列表/详情统一 include（避免字段漂移） */
const CLASS_INCLUDE = {
  grade: { select: { id: true, name: true, code: true } },
  headTeacher: { select: { id: true, name: true, teacherNo: true } },
};

/**
 * ClassService — 班级管理
 *
 * 数据权限（与 student 模块同口径，依据 @DataScope() 计算出的 user.dataScope）：
 * - ALL   （管理员 / 政教）        → 不受限
 * - GRADE （年级主任）            → 仅本年级（dataScope.gradeId）
 * - CLASS （班主任）              → 仅本班（dataScope.classId）
 * - DORM / SELF（宿管 / 任课教师） → 无班级管理范围，列表返回空、写操作一律拒绝
 *
 * 关键安全约束：
 * 1. 年级主任新增班级时，**不信任**前端传入的 gradeId —— 一律以
 *    授权范围内的 dataScope.gradeId 为准（传入不一致直接 403）；
 * 2. 编辑 / 删除前，强制校验目标班级所属年级是否在授权范围内（杜绝 IDOR）；
 * 3. 删除前检查关联数据（学生 / 教师班级关系 / 请假记录 / 时间轴），
 *    存在任一关联则拒绝删除，绝不级联删除业务数据；
 * 4. schoolId 一律由服务端依据年级推导，不接受前端传入。
 */
@Injectable()
export class ClassService {
  private readonly logger = new Logger('ClassService');

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // 查询
  // ============================================================

  async findAll(query: ClassQueryDto, user: CurrentUserPayload) {
    const scopeFilter = this.buildScopeFilter(this.requireScope(user));

    const where: Prisma.ClassWhereInput = {
      deletedAt: null,
      ...scopeFilter,
    };

    if (query.schoolId) where.schoolId = query.schoolId;
    if (query.gradeId) where.gradeId = query.gradeId;
    if (query.keyword) {
      where.OR = [{ name: { contains: query.keyword } }, { code: { contains: query.keyword } }];
    }

    const [list, total] = await Promise.all([
      this.prisma.class.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: [{ gradeId: 'asc' }, { code: 'asc' }],
        include: CLASS_INCLUDE,
      }),
      this.prisma.class.count({ where }),
    ]);

    const withSchool = await this.attachSchool(list);

    return {
      list: withSchool,
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findOne(id: string, user: CurrentUserPayload) {
    const cls = await this.prisma.class.findUnique({
      where: { id, deletedAt: null },
      include: {
        ...CLASS_INCLUDE,
        viceHeadTeacher: { select: { id: true, name: true, teacherNo: true } },
      },
    });

    if (!cls) {
      throw new NotFoundException('班级不存在');
    }

    // 数据范围校验：越权访问一律按「不存在」处理，避免资源枚举
    this.assertInScope(cls.gradeId, cls.id, this.requireScope(user));

    const [withSchool] = await this.attachSchool([cls]);
    return withSchool;
  }

  /**
   * 新增班级时可选的年级列表（供表单下拉），同时受数据范围约束：
   * - ALL   → 全部年级
   * - GRADE → 仅本人负责的年级
   * - 其他  → 空列表
   */
  async listGradeOptions(user: CurrentUserPayload) {
    const scope = this.requireScope(user);

    if (scope.type === 'GRADE') {
      if (!scope.gradeId) return { list: [] };
      const grades = await this.prisma.grade.findMany({
        where: { id: String(scope.gradeId), deletedAt: null },
        select: { id: true, name: true, code: true, schoolId: true },
        orderBy: { name: 'asc' },
      });
      return { list: grades };
    }

    if (scope.type === 'ALL') {
      const grades = await this.prisma.grade.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, code: true, schoolId: true },
        orderBy: [{ enrollmentYear: 'desc' }, { name: 'asc' }],
      });
      return { list: grades };
    }

    return { list: [] };
  }

  // ============================================================
  // 写入
  // ============================================================

  async create(dto: CreateClassDto, user: CurrentUserPayload) {
    const scope = this.requireScope(user);
    const gradeId = this.resolveCreatableGradeId(dto.gradeId, scope);

    const grade = await this.prisma.grade.findUnique({
      where: { id: gradeId },
      select: { id: true, schoolId: true, deletedAt: true, name: true },
    });
    if (!grade || grade.deletedAt) {
      throw new BadRequestException('目标年级不存在');
    }

    // 班级编码在同一grade内唯一（@@unique([gradeId, code])）
    const dup = await this.prisma.class.findFirst({
      where: { gradeId, code: dto.code.trim() },
      select: { id: true, deletedAt: true },
    });
    if (dup) {
      throw new BadRequestException(
        dup.deletedAt
          ? '该年级下已存在同编码的（已删除）班级，请更换班级编码'
          : '该年级下班级编码已存在',
      );
    }

    if (dto.headTeacherId) await this.assertTeacherExists(dto.headTeacherId);
    if (dto.viceHeadTeacherId) await this.assertTeacherExists(dto.viceHeadTeacherId);

    const created = await this.prisma.class.create({
      data: {
        gradeId,
        // 学校由年级推导，不接受前端传入，杜绝跨校注入
        schoolId: grade.schoolId,
        code: dto.code.trim(),
        name: dto.name.trim(),
        headTeacherId: dto.headTeacherId ?? null,
        viceHeadTeacherId: dto.viceHeadTeacherId ?? null,
        ...(dto.status ? { status: dto.status } : {}),
      },
      include: CLASS_INCLUDE,
    });

    this.logger.log(
      `新增班级: ${created.name}(${created.code}) 年级=${grade.name}, 操作人=${user.name}`,
    );

    const [withSchool] = await this.attachSchool([created]);
    return withSchool;
  }

  async update(id: string, dto: UpdateClassDto, user: CurrentUserPayload) {
    const scope = this.requireScope(user);

    const existing = await this.prisma.class.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, gradeId: true, code: true, name: true, schoolId: true },
    });
    if (!existing) {
      throw new NotFoundException('班级不存在');
    }

    // 必须以「目标班级当前所属年级」校验授权范围（年级主任 / 班主任越权直接拒绝）
    this.assertManageGrade(existing.gradeId, scope);

    const data: Prisma.ClassUpdateInput = {};

    // 换年级：需要同时具备「源年级」与「目标年级」的管理权限，且重新推导 schoolId
    if (dto.gradeId && dto.gradeId !== existing.gradeId) {
      this.assertManageGrade(dto.gradeId, scope);
      const grade = await this.prisma.grade.findUnique({
        where: { id: dto.gradeId },
        select: { id: true, schoolId: true, deletedAt: true },
      });
      if (!grade || grade.deletedAt) {
        throw new BadRequestException('目标年级不存在');
      }
      data.grade = { connect: { id: grade.id } };
      // Class.schoolId 是标量列（Class 无 school 关联），随年级重新推导赋值
      data.schoolId = grade.schoolId;
    }

    if (dto.code !== undefined) {
      const code = dto.code.trim();
      const targetGradeId = dto.gradeId ?? existing.gradeId;
      const dup = await this.prisma.class.findFirst({
        where: { gradeId: targetGradeId, code, id: { not: id } },
        select: { id: true },
      });
      if (dup) {
        throw new BadRequestException('该年级下班级编码已存在');
      }
      data.code = code;
    }

    if (dto.name !== undefined) data.name = dto.name.trim();

    if (dto.headTeacherId !== undefined) {
      if (dto.headTeacherId) await this.assertTeacherExists(dto.headTeacherId);
      data.headTeacher = dto.headTeacherId ? { connect: { id: dto.headTeacherId } } : { disconnect: true };
    }

    if (dto.viceHeadTeacherId !== undefined) {
      if (dto.viceHeadTeacherId) await this.assertTeacherExists(dto.viceHeadTeacherId);
      data.viceHeadTeacher = dto.viceHeadTeacherId
        ? { connect: { id: dto.viceHeadTeacherId } }
        : { disconnect: true };
    }

    if (dto.status !== undefined) data.status = dto.status;

    const updated = await this.prisma.class.update({
      where: { id },
      data,
      include: CLASS_INCLUDE,
    });

    this.logger.log(`修改班级: ${updated.name}(${updated.code}), 操作人=${user.name}`);

    const [withSchool] = await this.attachSchool([updated]);
    return withSchool;
  }

  /**
   * 删除班级
   *
   * 安全策略：
   * 1. 数据范围校验（同 update）；
   * 2. 删除前统计关联业务数据 —— 学生（未删除）、教师班级关系、请假记录、时间轴事件；
   *    存在任一即拒绝，返回可读的拦截原因；
   * 3. 项目已对 Class 建模 `deletedAt`（软删除），因此通过后将执行**软删除**，
   *    历史数据完整保留，不做任何级联删除。
   */
  async remove(id: string, user: CurrentUserPayload) {
    const scope = this.requireScope(user);

    const existing = await this.prisma.class.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, gradeId: true, name: true, code: true },
    });
    if (!existing) {
      throw new NotFoundException('班级不存在');
    }

    this.assertManageGrade(existing.gradeId, scope);

    const [studentCount, teacherRelationCount, leaveCount, timelineCount] = await Promise.all([
      this.prisma.student.count({ where: { classId: id, deletedAt: null } }),
      this.prisma.teacherClassRelation.count({ where: { classId: id } }),
      this.prisma.leaveRecord.count({ where: { classId: id, deletedAt: null } }),
      this.prisma.timelineEvent.count({ where: { classId: id } }),
    ]);

    const blockers: string[] = [];
    if (studentCount > 0) blockers.push(`${studentCount} 名学生`);
    if (teacherRelationCount > 0) blockers.push(`${teacherRelationCount} 条教师班级关系`);
    if (leaveCount > 0) blockers.push(`${leaveCount} 条请假记录`);
    if (timelineCount > 0) blockers.push(`${timelineCount} 条时间轴事件`);

    if (blockers.length > 0) {
      throw new BadRequestException(
        `无法删除班级「${existing.name}」：仍存在关联数据（${blockers.join('、')}）。` +
          '请先转移或清理相关数据（不做级联删除）。',
      );
    }

    await this.prisma.class.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`删除班级（软删除）: ${existing.name}(${existing.code}), 操作人=${user.name}`);

    return { success: true };
  }

  // ============================================================
  // 内部：数据范围
  // ============================================================

  /** 获取数据范围；缺失时按最小权限（SELF）兜底，避免误放行 */
  private requireScope(user: CurrentUserPayload): DataScope {
    return user?.dataScope ?? { type: 'SELF' };
  }

  /** 列表过滤条件 */
  private buildScopeFilter(scope: DataScope): Prisma.ClassWhereInput {
    switch (scope.type) {
      case 'ALL':
        return {};
      case 'GRADE':
        return scope.gradeId ? { gradeId: String(scope.gradeId) } : { id: '__nonexistent__' };
      case 'CLASS':
        return scope.classId ? { id: String(scope.classId) } : { id: '__nonexistent__' };
      default:
        // DORM / SELF：无班级管理范围 → 返回空集
        return { id: '__nonexistent__' };
    }
  }

  /** 读操作范围断言（越权按不存在处理） */
  private assertInScope(gradeId: string, classId: string, scope: DataScope): void {
    switch (scope.type) {
      case 'ALL':
        return;
      case 'GRADE':
        if (scope.gradeId && gradeId === String(scope.gradeId)) return;
        throw new NotFoundException('班级不存在');
      case 'CLASS':
        if (scope.classId && classId === String(scope.classId)) return;
        throw new NotFoundException('班级不存在');
      default:
        throw new NotFoundException('班级不存在');
    }
  }

  /** 写操作范围断言（越权抛 403，明确拒绝） */
  private assertManageGrade(gradeId: string, scope: DataScope): void {
    if (scope.type === 'ALL') return;
    if (scope.type === 'GRADE' && scope.gradeId && gradeId === String(scope.gradeId)) return;
    throw new ForbiddenException('无权操作该班级（超出您的数据范围）');
  }

  /**
   * 计算新增班级时使用的 gradeId（年级主任不信任前端传入值）
   */
  private resolveCreatableGradeId(inputGradeId: string | undefined, scope: DataScope): string {
    if (scope.type === 'ALL') {
      if (!inputGradeId) {
        throw new BadRequestException('请选择所属年级');
      }
      return inputGradeId;
    }

    if (scope.type === 'GRADE') {
      if (!scope.gradeId) {
        throw new ForbiddenException('未找到您负责的年级，无法新增班级');
      }
      if (inputGradeId && inputGradeId !== String(scope.gradeId)) {
        throw new ForbiddenException('无权在该年级新增班级（超出您的数据范围）');
      }
      // 以授权范围为准，忽略前端可能传入的其他年级
      return String(scope.gradeId);
    }

    throw new ForbiddenException('无新增班级的权限');
  }

  private async assertTeacherExists(teacherId: string): Promise<void> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { id: true, deletedAt: true, status: true },
    });
    if (!teacher || teacher.deletedAt) {
      throw new BadRequestException('指定的教师不存在');
    }
    if (teacher.status !== 'ACTIVE') {
      throw new BadRequestException('指定的教师已被禁用');
    }
  }

  /** 批量补全 school 信息（Class 模型无 school 关联，只能按 schoolId 单独解析） */
  private async attachSchool<T extends { schoolId: string | null }>(
    list: T[],
  ): Promise<Array<T & { school: { id: string; name: string; shortName: string | null } | null }>> {
    const schoolIds = Array.from(
      new Set(list.map((c) => c.schoolId).filter((v): v is string => Boolean(v))),
    );
    const schools = schoolIds.length
      ? await this.prisma.school.findMany({
          where: { id: { in: schoolIds } },
          select: { id: true, name: true, shortName: true },
        })
      : [];
    const schoolMap = new Map(schools.map((s) => [s.id, s]));

    return list.map((c) => ({
      ...c,
      school: c.schoolId ? (schoolMap.get(c.schoolId) ?? null) : null,
    }));
  }
}
