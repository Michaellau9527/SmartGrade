/** 任务来源 */
export type TaskSource =
  | 'GRADE_DIRECTOR'      // 年级主任下发
  | 'HEAD_TEACHER'        // 班主任指派
  | 'SYSTEM_TEMPLATE'     // 系统模板（周报 / 月报 / 节假日）
  | 'CROSS_DEPARTMENT'    // 跨部门协同
  | 'OTHER';

export const TaskSourceText: Record<TaskSource, string> = {
  GRADE_DIRECTOR: '年级主任',
  HEAD_TEACHER: '班主任',
  SYSTEM_TEMPLATE: '系统模板',
  CROSS_DEPARTMENT: '跨部门',
  OTHER: '其他',
};
