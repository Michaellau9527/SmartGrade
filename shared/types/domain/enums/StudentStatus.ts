/**
 * StudentStatus — 学生在校状态枚举
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.2 §2.5.1.1
 *
 * 回答的问题：「学生与学校的关系是什么？」
 *
 * ⚠️ v1.1 → v1.2 变更：
 * - 删除 `LEAVING`（合并入 `ON_CAMPUS` + Location.GATE）
 * - 删除 `DORM`（已迁移到 StudentLocation.DORM）
 * - 删除 `PENDING_LEAVE`（v4.1 旧枚举）
 * - 删除 `LEFT_SCHOOL`（v4.1 旧枚举）
 * - 删除 `IN_SCHOOL`（v4.1 旧枚举）
 *
 * 永久冻结：4 状态
 */
export type StudentStatus =
  | 'ON_CAMPUS'        // 在校（默认）
  | 'OUT_OF_SCHOOL'    // 离校（请假中）
  | 'GRADUATED'        // 已毕业（不可逆）
  | 'TRANSFERRED';     // 已转学（不可逆）

/** 永久黑名单（禁止使用的旧枚举） */
// - IN_SCHOOL       （v4.1 旧枚举）
// - PENDING_LEAVE   （v4.1 旧枚举）
// - LEFT_SCHOOL     （v4.1 旧枚举）
// - LEAVING         （v1.1 引入，已被 ON_CAMPUS + Location.GATE 替代）
// - DORM            （v1.1 引入，已被 Location.DORM 替代）

/** 状态显示文本 */
export const StudentStatusText: Record<StudentStatus, string> = {
  ON_CAMPUS: '在校',
  OUT_OF_SCHOOL: '离校',
  GRADUATED: '已毕业',
  TRANSFERRED: '已转学',
};

/** 状态颜色（前端 Tag 用） */
export const StudentStatusColor: Record<StudentStatus, string> = {
  ON_CAMPUS: 'green',
  OUT_OF_SCHOOL: 'orange',
  GRADUATED: 'default',
  TRANSFERRED: 'default',
};
