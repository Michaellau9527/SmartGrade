/**
 * 首页静态/占位数据
 * 真实数据接入后仅保留"班级动态"等装饰性 mock
 */
import type { TimelineItem } from '../components/Timeline';
import type { WorkbenchResponse, WorkbenchTodo, WorkbenchNotice } from '../api/workbench';

// ============================================================
// Mock 模式开关：true = 使用本地 mock 数据，不调用后端
// 接入 /auth/me 后改为 false 即可切回真实数据
// ============================================================
export const USE_HOMEROOM_MOCK = true;

/** 班主任：班级动态 mock（等"班级动态"接口接入后再移除） */
export const HEADMASTER_TIMELINE_MOCK: TimelineItem[] = [
  {
    id: 't-1',
    title: '王同学已返校',
    desc: '原请假 2 天，今天 08:12 完成入校登记',
    time: dayjsNow(-2),
    type: 'SUCCESS',
    tag: '入校'
  },
  {
    id: 't-2',
    title: '李同学家长来电请假',
    desc: '身体不适，申请 1 天病假',
    time: dayjsNow(-60),
    type: 'WARNING',
    tag: '请假'
  },
  {
    id: 't-3',
    title: '宿舍 305 晚归提醒',
    desc: '张同学 22:40 后入校，已通知宿管',
    time: dayjsNow(-180),
    type: 'DANGER',
    tag: '异常'
  },
  {
    id: 't-4',
    title: '本周班级量化分第一',
    desc: '卫生、纪律、考勤综合 98 分',
    time: dayjsNow(-1440),
    type: 'INFO',
    tag: '班级'
  }
];

/** 年级主任：任务完成情况 mock */
export const GRADE_TASK_PROGRESS_MOCK = [
  { name: '期中考务', percent: 78, color: '#1677ff' },
  { name: '家长会筹备', percent: 56, color: '#52c41a' },
  { name: '教学常规检查', percent: 92, color: '#fa8c16' }
];

/** 政教老师：全校异常提醒 mock */
export const POLITICAL_ALERT_MOCK: TimelineItem[] = [
  {
    id: 'a-1',
    title: '高二三班 3 名学生未按时返校',
    desc: '已通知班主任，请关注',
    time: dayjsNow(-30),
    type: 'DANGER',
    tag: '紧急'
  },
  {
    id: 'a-2',
    title: '宿舍楼 A 区晚归 5 人',
    desc: '本周累计 12 人次',
    time: dayjsNow(-90),
    type: 'WARNING',
    tag: '晚归'
  },
  {
    id: 'a-3',
    title: '校园欺凌投诉 1 起',
    desc: '已派单到年级主任',
    time: dayjsNow(-240),
    type: 'DANGER',
    tag: '投诉'
  }
];

/** 课任教师：任教班级 mock */
export const SUBJECT_TEACHER_CLASSES_MOCK = [
  { id: 'c1', name: '高三（1）班', grade: '高三', students: 42, today: '出勤 41/42' },
  { id: 'c2', name: '高三（3）班', grade: '高三', students: 40, today: '出勤 40/40' },
  { id: 'c3', name: '高二（2）班', grade: '高二', students: 45, today: '出勤 43/45' }
];

/** 课任教师：授课班级出勤 mock（等待后端接口） */
export const SUBJECT_TEACHER_ATTENDANCE_MOCK: AttendanceRow[] = [
  { classId: 'c1', className: '高三（1）班', grade: '高三', expected: 42, actual: 41, leave: 1 },
  { classId: 'c2', className: '高三（3）班', grade: '高三', expected: 40, actual: 40, leave: 0 },
  { classId: 'c3', className: '高二（2）班', grade: '高二', expected: 45, actual: 43, leave: 2 }
];

/** 授课班级出勤单行数据结构 */
export interface AttendanceRow {
  classId: string;
  className: string;
  grade: string;
  expected: number;
  actual: number;
  leave: number;
}

function dayjsNow(minutesAgo: number): string {
  // 直接用 ISO 字符串，避免引入 dayjs
  const d = new Date(Date.now() + minutesAgo * 60 * 1000);
  return d.toISOString();
}

// ============================================================
// 班主任工作台 Mock 数据（USE_HOMEROOM_MOCK = true 时生效）
// 等 /auth/me 和 /workbench 接口稳定后，删除此段即可
// ============================================================

/** 班主任 mock 用户信息 */
export const MOCK_HOMEROOM_USER = {
  token: 'mock-token-homeroom-2024',
  teacherNo: 'T001',
  teacherName: '刘忠昊',
  roles: ['ROLE_HEADMASTER'] as string[],
  permissions: [
    'student:read',
    'student:write',
    'leave:approve',
    'notice:publish',
    'class:manage',
    'statistics:read'
  ] as string[]
};

/** 根据当前时间生成欢迎语 */
export function getWelcomeGreeting(): string {
  const h = new Date().getHours();
  if (h < 9) return '早上好，刘老师';
  if (h < 12) return '上午好，刘老师';
  if (h < 14) return '中午好，刘老师';
  if (h < 18) return '下午好，刘老师';
  return '晚上好，刘老师';
}

/** 班主任工作台 mock 待办 */
const MOCK_HOMEROOM_TODOS: WorkbenchTodo[] = [
  {
    id: 'mock-todo-1',
    title: '张三提交请假申请 — 身体不适，申请明天病假 1 天',
    type: 'LEAVE_APPROVE',
    status: 'PENDING',
    dueAt: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
    sourceType: 'LEAVE',
    sourceId: 'leave-001'
  },
  {
    id: 'mock-todo-2',
    title: '完成本周班级量化考核表',
    type: 'TASK_COMPLETE',
    status: 'IN_PROGRESS',
    dueAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    sourceType: 'TASK',
    sourceId: 'task-001'
  },
  {
    id: 'mock-todo-3',
    title: '宿舍 305 卫生检查不合格 — 需整改',
    type: 'DORM_CHECK',
    status: 'PENDING',
    dueAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
    sourceType: 'DORM',
    sourceId: 'dorm-001'
  }
];

/** 班主任工作台 mock 通知 */
const MOCK_HOMEROOM_NOTICES: WorkbenchNotice[] = [
  {
    id: 'mock-notice-1',
    title: '【紧急】今天下午 4:00 年级组召开期中考试部署会议',
    noticeType: 'URGENT',
    publishedAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    isRead: false
  },
  {
    id: 'mock-notice-2',
    title: '关于五一假期安排及安全教育通知',
    noticeType: 'HOLIDAY',
    publishedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    isRead: false
  },
  {
    id: 'mock-notice-3',
    title: '本周教研活动改为周五下午第二节',
    noticeType: 'TEACHING',
    publishedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    isRead: true
  },
  {
    id: 'mock-notice-4',
    title: '高一年级组例行班会通知',
    noticeType: 'NOTICE',
    publishedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    isRead: true
  }
];

/** 班主任工作台完整 mock 响应 */
export const MOCK_HOMEROOM_WORKBENCH: WorkbenchResponse = {
  today: {
    date: (() => {
      const now = new Date();
      return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
    })(),
    week: (() => {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days[new Date().getDay()];
    })(),
    semesterWeek: 12,
    isSchoolDay: true
  },
  todos: MOCK_HOMEROOM_TODOS,
  studentStatusSummary: {
    totalStudents: 48,
    onCampus: 46,
    outOfSchool: 2,
    studentsLeaving: 2,
    overdueReturn: 0,
    dormAbnormal: 1
  },
  recentNotices: MOCK_HOMEROOM_NOTICES,
  quickActions: []
};
