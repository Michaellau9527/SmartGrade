/**
 * 系统角色判定规则（Role 模型无 isSystem 字段时的单一真相源）
 * =====================================================================
 * `Role` 模型目前没有 `isSystem` 布尔字段，因此“哪些角色属于系统级、不可被
 * 普通管理员篡改或创建”只能由一份集中维护的清单决定。本文件的 `SYSTEM_ROLE_CODES`
 * 即为该清单的**单一真相源（single source of truth）**，被 role.service 的两处
 * 防护逻辑共用：
 *   1. assignPermissions —— 系统角色的权限仅允许 ROLE_ADMIN 修改；
 *   2. create            —— 任何属于 SYSTEM_ROLE_CODES 的 roleCode，非 ROLE_ADMIN 不得创建。
 *
 * 判定规则：roleCode ∈ SYSTEM_ROLE_CODES ⇔ 该角色为系统角色。
 *
 * ⚠️ 本清单须与 prisma/seed.ts 中 seedRolesAndPermissions() 以 upsert 写入的
 * 角色保持一致。若后续 seed 新增系统角色，必须同步更新本清单，否则新系统角色
 * 将不受保护（仅被 seed 以全量权限初始化，却可由普通管理员改写权限）。
 */
export const SYSTEM_ROLE_CODES: readonly string[] = [
  'ROLE_ADMIN',
  'ROLE_GRADE_DIRECTOR',
  'ROLE_POLITICAL',
  'ROLE_HEADMASTER',
  'ROLE_DORM_MANAGER',
  'ROLE_SUBJECT_TEACHER',
  'ROLE_GATE_GUARD',
] as const;

export const ROLE_ADMIN = 'ROLE_ADMIN';

/** 判断给定 roleCode 是否为系统角色（大小写敏感，与数据库存储一致）。 */
export function isSystemRole(roleCode: string | null | undefined): boolean {
  if (!roleCode) return false;
  return (SYSTEM_ROLE_CODES as readonly string[]).includes(roleCode);
}

/**
 * 自定义角色编码格式：
 * - 必须以 ROLE_ 开头；
 * - 仅含大写字母、数字、下划线；
 * - 长度 1–50（与 schema.prisma Role.roleCode @db.VarChar(50) 对齐）。
 */
export const ROLE_CODE_PATTERN = /^ROLE_[A-Z0-9_]+$/;

export function isValidRoleCodeFormat(roleCode: string | null | undefined): boolean {
  if (typeof roleCode !== 'string') return false;
  if (roleCode.length === 0 || roleCode.length > 50) return false;
  return ROLE_CODE_PATTERN.test(roleCode);
}
