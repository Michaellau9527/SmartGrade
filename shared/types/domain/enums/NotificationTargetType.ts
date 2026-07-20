/**
 * NotificationTargetType — 通知推送目标类型（8 种 - v4 冻结）
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.2 §3.3
 *
 * 永久冻结：8 类型。
 */
export type NotificationTargetType =
  | 'ALL_TEACHERS'         // 全校教师
  | 'GRADE'                // 指定年级
  | 'CLASS'                // 指定班级
  | 'TEACHING_GROUP'       // 教研组
  | 'TAG'                  // 标签（党员 / 英语组 / 骨干教师 / 值班教师）
  | 'ROLE'                 // 角色（全体班主任 / 全体年级主任）
  | 'STUDENT_PARENT'       // 学生家长（按学生 ID 展开）
  | 'INDIVIDUAL_TEACHER';  // 指定教师

export const NotificationTargetTypeText: Record<NotificationTargetType, string> = {
  ALL_TEACHERS: '全校教师',
  GRADE: '年级',
  CLASS: '班级',
  TEACHING_GROUP: '教研组',
  TAG: '标签',
  ROLE: '角色',
  STUDENT_PARENT: '学生家长',
  INDIVIDUAL_TEACHER: '指定教师',
};
