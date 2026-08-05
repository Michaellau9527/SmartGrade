/**
 * 首页静态/占位数据
 * 真实数据接入后仅保留"班级动态"等装饰性 mock
 */
import type { TimelineItem } from '../components/Timeline';

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
