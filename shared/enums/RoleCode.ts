/**
 * RoleCode — 系统角色编码
 *
 * 上游规则：docs/10-Permission.md + Sprint 2.1 Day 5.1 刘老师 2026-07-20 拍板
 *
 * 设计原则：
 * - 统一前缀 ROLE_，日志 / JWT / 数据库全部一致
 * - 与 TeacherClassRole（业务身份枚举）是不同概念：
 *   TeacherClassRole = 教师与班级的关系（班主任/任课教师/副班主任/心理辅导员）
 *   RoleCode       = 系统权限角色（决定"能做什么"）
 * - 8 个角色覆盖 Sprint 2 全部用户类型
 *
 * 冻结状态：v1.0 冻结，Sprint 2 不新增
 */

export enum RoleCode {
  /** 系统管理员 — 拥有全部权限 */
  ROLE_ADMIN = 'ROLE_ADMIN',

  /** 年级主任 — 查看本年级全部数据、发布通知、查看统计、管理班级 */
  ROLE_GRADE_DIRECTOR = 'ROLE_GRADE_DIRECTOR',

  /** 政教 — 审批请假、查看学生状态、处理异常、查看统计 */
  ROLE_POLITICAL = 'ROLE_POLITICAL',

  /** 班主任 — 管理本班学生、发起请假、销假、查看时间轴 */
  ROLE_HEADMASTER = 'ROLE_HEADMASTER',

  /** 任课教师 — 查看通知、查看文件、查看个人待办，无学生管理权限 */
  ROLE_SUBJECT_TEACHER = 'ROLE_SUBJECT_TEACHER',

  /** 宿舍管理员 — 查看住宿生、查寝、上报异常、查看住宿请假 */
  ROLE_DORM_MANAGER = 'ROLE_DORM_MANAGER',

  /** 家长 — 查看自己孩子信息、接收通知 */
  ROLE_PARENT = 'ROLE_PARENT',

  /** 学生 — 查看个人请假、接收通知（v1.2 暂不实现学生端） */
  ROLE_STUDENT = 'ROLE_STUDENT',
}

/** 角色显示文本 */
export const RoleCodeText: Record<RoleCode, string> = {
  [RoleCode.ROLE_ADMIN]: '系统管理员',
  [RoleCode.ROLE_GRADE_DIRECTOR]: '年级主任',
  [RoleCode.ROLE_POLITICAL]: '政教',
  [RoleCode.ROLE_HEADMASTER]: '班主任',
  [RoleCode.ROLE_SUBJECT_TEACHER]: '任课教师',
  [RoleCode.ROLE_DORM_MANAGER]: '宿管',
  [RoleCode.ROLE_PARENT]: '家长',
  [RoleCode.ROLE_STUDENT]: '学生',
};
