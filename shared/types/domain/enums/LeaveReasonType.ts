/**
 * LeaveReasonType — 请假原因分类（6 枚举 - v1.1 冻结 - 必填）
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.2 §1.3.1.1
 *
 * ⚠️ 重要：不要只存 `reason: "肚子疼"` 这种自由文本。
 * 未来需要做请假统计分析（年级主任看板、Sprint 3 数据分析）必须**结构化**。
 *
 * 永久冻结：6 枚举。
 */
export type LeaveReasonType =
  | 'ILLNESS'           // 身体原因（生病、受伤）
  | 'PERSONAL'          // 个人事务
  | 'FAMILY'            // 家庭原因（家中有事、直系亲属）
  | 'SPORT'             // 体育比赛 / 训练
  | 'SCHOOL_ACTIVITY'   // 学校集体活动
  | 'OTHER';            // 其他

export const LeaveReasonTypeText: Record<LeaveReasonType, string> = {
  ILLNESS: '身体原因',
  PERSONAL: '个人事务',
  FAMILY: '家庭原因',
  SPORT: '体育/训练',
  SCHOOL_ACTIVITY: '学校活动',
  OTHER: '其他',
};

export const LeaveReasonTypeColor: Record<LeaveReasonType, string> = {
  ILLNESS: 'red',
  PERSONAL: 'blue',
  FAMILY: 'orange',
  SPORT: 'green',
  SCHOOL_ACTIVITY: 'purple',
  OTHER: 'default',
};
