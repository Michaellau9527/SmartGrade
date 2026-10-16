import type { TagProps } from 'antd';

export interface StatusMapEntry {
  label: string;
  color: TagProps['color'];
}

export type StatusMap = Record<string, StatusMapEntry>;

export const todoStatusMap: StatusMap = {
  TODO: { label: '待处理', color: 'warning' },
  PROCESSING: { label: '处理中', color: 'processing' },
  DONE: { label: '已完成', color: 'success' },
  CANCELLED: { label: '已取消', color: 'default' },
};

/**
 * 请假状态映射 — 对齐后端 LeaveStatus 8 状态（v4.2 冻结）：
 * DRAFT→PENDING→APPROVED→LEFT→RETURNED→CLOSED / REJECTED / CANCELLED
 * （旧 FINISHED 已被 CLOSED 替代，Sprint 1 遗留禁用）
 */
export const leaveStatusMap: StatusMap = {
  DRAFT: { label: '草稿', color: 'default' },
  PENDING: { label: '待审批', color: 'warning' },
  APPROVED: { label: '已通过', color: 'processing' },
  REJECTED: { label: '已驳回', color: 'error' },
  LEFT: { label: '已离校', color: 'orange' },
  RETURNED: { label: '已返校', color: 'cyan' },
  CLOSED: { label: '已销假', color: 'success' },
  CANCELLED: { label: '已撤销', color: 'default' },
};

export const noticeStatusMap: StatusMap = {
  DRAFT: { label: '草稿', color: 'default' },
  PUBLISHED: { label: '已发布', color: 'success' },
  WITHDRAWN: { label: '已撤回', color: 'warning' },
};

export const priorityMap: StatusMap = {
  URGENT: { label: '紧急', color: 'error' },
  HIGH: { label: '高', color: 'warning' },
  NORMAL: { label: '普通', color: 'processing' },
  LOW: { label: '低', color: 'default' },
};

export const businessTypeMap: StatusMap = {
  LEAVE: { label: '请假', color: 'purple' },
  NOTICE: { label: '通知', color: 'blue' },
  DORM: { label: '宿舍', color: 'cyan' },
  SYSTEM: { label: '系统', color: 'default' },
};

export const studentStatusMap: StatusMap = {
  IN_SCHOOL: { label: '在校', color: 'success' },
  PENDING_LEAVE: { label: '待离校', color: 'warning' },
  LEFT_SCHOOL: { label: '离校', color: 'processing' },
  SUSPENDED: { label: '休学', color: 'default' },
  GRADUATED: { label: '毕业', color: 'default' },
};

export const dormStatusMap: StatusMap = {
  NORMAL: { label: '正常', color: 'success' },
  DISABLED: { label: '停用', color: 'default' },
};

/** 所有支持的状态映射类型名称 */
export type StatusMapType =
  | 'todo-status'
  | 'leave-status'
  | 'notice-status'
  | 'priority'
  | 'business-type'
  | 'student-status'
  | 'dorm-status';

/** 根据 type 返回对应的映射表 */
export function getStatusMap(type: StatusMapType): StatusMap {
  switch (type) {
    case 'todo-status': return todoStatusMap;
    case 'leave-status': return leaveStatusMap;
    case 'notice-status': return noticeStatusMap;
    case 'priority': return priorityMap;
    case 'business-type': return businessTypeMap;
    case 'student-status': return studentStatusMap;
    case 'dorm-status': return dormStatusMap;
  }
}