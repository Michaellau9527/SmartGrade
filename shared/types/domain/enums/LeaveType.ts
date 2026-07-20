/**
 * LeaveType — 请假大类（v1.2 保留）
 */
export type LeaveType =
  | 'SICK'        // 病假
  | 'PERSONAL'    // 事假
  | 'OTHER';      // 其他

export const LeaveTypeText: Record<LeaveType, string> = {
  SICK: '病假',
  PERSONAL: '事假',
  OTHER: '其他',
};
