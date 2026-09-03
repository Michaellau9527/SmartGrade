/**
 * 通知学校归属解析 — 纯函数（P1-8）
 *
 * 背景：notice.controller 的 buildAuthContext 此前把 organization.schoolId
 * 写死为空串，导致 createNotice 写入的 Notice / TimelineEvent 全部落库
 * schoolId=''（schema 中 school_id 是普通 String 列，非外键，空串可入库）。
 * 后果：workbench 按 schoolId 过滤时这些通知永远不出现；列表接口也
 * 无法按学校隔离。
 *
 * 解析规则（deny-by-default，与 workbench 派生口径一致）：
 * 1. 优先用教师的真实组织关系（TeacherClassRelation→class.schoolId、
 *    grade.director→grade.schoolId）；
 * 2. 关系间必须指向同一所学校，多校歧义 → null（不猜）；
 * 3. 无任何关系的全校角色（ADMIN/POLITICAL，复用 P1-1 的角色判定口径），
 *    仅当全库恰好一所学校时用唯一学校兜底；多校/零校 → null。
 */

import type { RoleCode } from '@smartgrade/shared/enums/RoleCode';
import { RoleCode as RC } from '@smartgrade/shared/enums/RoleCode';

/**
 * 从教师组织关系（班级关系 + 年级主任）中解析唯一 schoolId。
 * - 去空白/去空串后去重；
 * - 恰好一所学校 → 返回该 schoolId；
 * - 无任何归属 / 跨校歧义 → 返回 null（调用方 fail-closed）。
 */
export function pickNoticeSchoolId(
  classSchoolIds: Array<string | null | undefined>,
  gradeSchoolIds: Array<string | null | undefined>,
): string | null {
  const distinct = new Set(
    [...classSchoolIds, ...gradeSchoolIds]
      .map((s) => (typeof s === 'string' ? s.trim() : ''))
      .filter((s) => s.length > 0),
  );
  if (distinct.size === 1) {
    return [...distinct][0];
  }
  return null;
}

/**
 * 是否允许做「全校角色 + 全库唯一学校」兜底。
 * 与 P1-1 的 computeWorkbenchSchoolWide 同口径：仅 ADMIN / POLITICAL。
 */
export function isSchoolWideRole(roleCodes: Array<string | RoleCode>): boolean {
  const codes = roleCodes as RoleCode[];
  return codes.includes(RC.ROLE_ADMIN) || codes.includes(RC.ROLE_POLITICAL);
}

/**
 * 全校角色的单校兜底：
 * - 非全校角色 → null（不做兜底）；
 * - 全库非恰好一所学校（0 所或多所）→ null（不猜）；
 * - 恰好一所 → 返回该学校 id。
 */
export function resolveFallbackSchoolId(
  schoolWide: boolean,
  schoolCount: number,
  firstSchoolId: string | null | undefined,
): string | null {
  if (!schoolWide) return null;
  if (schoolCount !== 1) return null;
  const id = typeof firstSchoolId === 'string' ? firstSchoolId.trim() : '';
  return id.length > 0 ? id : null;
}
