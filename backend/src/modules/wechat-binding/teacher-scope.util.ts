/**
 * 教师数据范围（DataScope）校验 —— P1-13 Gate D
 * ---------------------------------------------------------------------------
 * 背景：
 *   Teacher 表**没有 schoolId 字段**，且 `DataScopeGuard` 只负责"计算"数据范围、
 *   不做任何拦截；`TeacherService` 现有方法也完全没有使用 dataScope。
 *   因此教师微信绑定的 init / unbind 必须在 Service 层**显式**校验目标教师
 *   是否落在调用者的数据范围内，否则任何持 `teacher:bind-wechat` 的角色
 *   都能凭 teacher UUID 绑定/解绑任意学校的教师（IDOR）。
 *
 * 复用而非重造：
 *   学校归属解析**完全复用 P1-8 已有口径**——
 *     `pickNoticeSchoolId` / `isSchoolWideRole` / `resolveFallbackSchoolId`
 *   （`src/modules/notice/notice-school.util.ts`），
 *   查询方式也与 `NoticeController._resolveSchoolId` 一致：
 *     TeacherClassRelation → class.schoolId
 *     grade.directorId     → grade.schoolId
 *   无任何新造关系、无猜测。
 *
 * 语义（deny-by-default）：
 *   - ROLE_ADMIN：保持既有"全局放行"语义（与 notice / workbench 同口径）。
 *   - 其他角色：调用者与目标教师必须解析出**同一所**学校；任一方解析不出来 → 拒绝。
 *   - dataScope.type === 'GRADE'（年级主任）：在学校相同之外，还要求目标教师
 *     确实属于该年级（TeacherClassRelation → class.gradeId，或该班班主任/副班主任）。
 */

import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma';
import type { CurrentUserPayload } from '@/common/types';
import { RoleCode } from '@smartgrade/shared/enums/RoleCode';
import {
  pickNoticeSchoolId,
  isSchoolWideRole,
  resolveFallbackSchoolId,
} from '../notice/notice-school.util';

/**
 * 解析某位教师所属学校（唯一值）。
 * - 有真实组织关系且指向同一所学校 → 返回该 schoolId；
 * - 跨校歧义 / 无任何关系且不满足"全校角色 + 全库唯一学校"兜底 → 返回 null（调用方必须拒绝）。
 */
export async function resolveTeacherSchoolId(
  prisma: PrismaService,
  teacherId: string,
  roles: string[],
): Promise<string | null> {
  const [classRels, directedGrades] = await Promise.all([
    prisma.teacherClassRelation.findMany({
      where: { teacherId, endDate: null },
      select: { class: { select: { schoolId: true } } },
    }),
    prisma.grade.findMany({
      where: { directorId: teacherId },
      select: { schoolId: true },
    }),
  ]);

  const direct = pickNoticeSchoolId(
    classRels.map((r) => r.class?.schoolId),
    directedGrades.map((g) => g.schoolId),
  );
  if (direct) return direct;

  // 无组织关系：仅全校角色（ADMIN / POLITICAL）在全库恰好一所学校时兜底
  if (isSchoolWideRole(roles)) {
    const schools = await prisma.school.findMany({ select: { id: true } });
    return resolveFallbackSchoolId(true, schools.length, schools[0]?.id ?? null);
  }

  return null;
}

/** 目标教师是否属于指定年级（班级关系 / 班主任 / 副班主任 任一命中） */
async function isTeacherInGrade(
  prisma: PrismaService,
  teacherId: string,
  gradeId: string,
): Promise<boolean> {
  const [relationCount, headClassCount] = await Promise.all([
    prisma.teacherClassRelation.count({
      where: { teacherId, endDate: null, class: { gradeId } },
    }),
    prisma.class.count({
      where: {
        gradeId,
        OR: [{ headTeacherId: teacherId }, { viceHeadTeacherId: teacherId }],
      },
    }),
  ]);
  return relationCount > 0 || headClassCount > 0;
}

/**
 * 校验目标教师是否落在调用者的数据范围内；越权抛 ForbiddenException（403 → 40001）。
 * fail-closed：任何"无法可靠判断"的情形一律拒绝，绝不猜测、绝不放宽。
 */
export async function assertTeacherInDataScope(
  prisma: PrismaService,
  actor: CurrentUserPayload,
  targetTeacherId: string,
): Promise<void> {
  // ROLE_ADMIN：保持既有全局放行语义
  if (actor?.roles?.includes(RoleCode.ROLE_ADMIN)) {
    return;
  }

  const actorSchoolId = await resolveTeacherSchoolId(
    prisma,
    String(actor?.id),
    actor?.roles ?? [],
  );
  // 目标教师按自身组织关系解析（不使用全校角色兜底，deny-by-default）
  const targetSchoolId = await resolveTeacherSchoolId(prisma, targetTeacherId, []);

  if (!actorSchoolId || !targetSchoolId || actorSchoolId !== targetSchoolId) {
    throw new ForbiddenException('无权操作该教师（数据范围受限）');
  }

  // 年级主任：学校相同还不够，必须同一年级
  if (actor?.dataScope?.type === 'GRADE' && actor.dataScope.gradeId) {
    const inGrade = await isTeacherInGrade(
      prisma,
      targetTeacherId,
      String(actor.dataScope.gradeId),
    );
    if (!inGrade) {
      throw new ForbiddenException('无权操作该教师（数据范围受限）');
    }
  }
}
