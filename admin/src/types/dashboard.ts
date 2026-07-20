/**
 * Dashboard 统计数据类型
 * 对应后端 StatisticsService 返回结构
 */

/** Dashboard 概览卡片数据 */
export interface DashboardOverview {
  totalStudents: number;
  inSchool: number;
  leftSchool: number;
  pendingLeave: number;
  todayLeaves: number;
  unreadNotices: number;
  todoCount: number;
}

/** 最近请假条目（简化版） */
export interface RecentLeaveItem {
  id: string;
  leave_no: string;
  student_name: string;
  leave_type: string;
  status: string;
  created_at: string;
}

/** 最近通知条目（简化版） */
export interface RecentNoticeItem {
  id: string;
  title: string;
  priority: string;
  created_at: string;
  publisher_name: string;
}

/** 最近时间轴条目 */
export interface RecentTimelineItem {
  id: string;
  event_type: string;
  event_title: string;
  student: {
    name: string;
  } | null;
  operator_teacher_name: string | null;
  created_at: string;
}
