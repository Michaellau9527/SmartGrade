/**
 * MSW Mock 数据
 * 所有模块的模拟数据集中管理
 */

// ─── 类型定义（确保 null/undefined 字段类型一致） ─────────
interface MockStudent {
  [key: string]: unknown;
  id: string;
  student_no: string;
  name: string;
  gender: string;
  phone: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  boarding_type: string;
  dorm_room_id: number | null;
  bed_no: string | null;
  status: string;
  class_id: number;
  created_at: string;
  class: { id: number; class_name: string; grade: { id: number; grade_name: string } | null } | null;
  dorm_room: { id: number; room_no: string; floor: number; building: { id: number; building_name: string } | null } | null;
}

interface MockLeave {
  [key: string]: unknown;
  id: string;
  leave_no: string;
  student_id: number;
  student_name: string;
  leave_type: string;
  leave_reason: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
  approver_id: number | null;
  approver_name: string | null;
  approve_remark: string | null;
  reject_reason: string | null;
  created_at: string;
  updated_at: string;
  class_id: number | null;
}

interface MockNotice {
  id: string;
  title: string;
  content: string;
  notice_type: string;
  publish_scope: string;
  priority: string;
  status: string;
  need_confirm: boolean;
  expired_at: string | null;
  publisher_id: number;
  publisher_name: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

interface MockTodo {
  [key: string]: unknown;
  id: string;
  todo_no: string;
  title: string;
  content: string | null;
  teacher_id: number;
  business_type: string;
  business_id: string | null;
  priority: string;
  status: string;
  deadline: string | null;
  finished_at: string | null;
  created_at: string;
  teacher: { id: number; name: string; teacher_no: string } | null;
}

// ─── Students ──────────────────────────────────────────
export const mockStudents: MockStudent[] = [
  {
    id: '1', student_no: 'S2024001', name: '张三', gender: 'MALE', phone: '13800138001',
    parent_name: '张大明', parent_phone: '13900139001', boarding_type: 'BOARDING',
    dorm_room_id: 101, bed_no: 'A', status: 'IN_SCHOOL', class_id: 1, created_at: '2024-09-01T08:00:00Z',
    class: { id: 1, class_name: '高一(1)班', grade: { id: 1, grade_name: '高一' } },
    dorm_room: { id: 101, room_no: '101', floor: 1, building: { id: 1, building_name: '男生宿舍楼A' } },
  },
  {
    id: '2', student_no: 'S2024002', name: '李四', gender: 'FEMALE', phone: '13800138002',
    parent_name: '李华', parent_phone: '13900139002', boarding_type: 'BOARDING',
    dorm_room_id: 201, bed_no: 'B', status: 'IN_SCHOOL', class_id: 1, created_at: '2024-09-01T08:00:00Z',
    class: { id: 1, class_name: '高一(1)班', grade: { id: 1, grade_name: '高一' } },
    dorm_room: { id: 201, room_no: '201', floor: 2, building: { id: 2, building_name: '女生宿舍楼B' } },
  },
  {
    id: '3', student_no: 'S2024003', name: '王五', gender: 'MALE', phone: '13800138003',
    parent_name: '王强', parent_phone: '13900139003', boarding_type: 'DAY',
    dorm_room_id: null, bed_no: null, status: 'PENDING_LEAVE', class_id: 2, created_at: '2024-09-01T08:00:00Z',
    class: { id: 2, class_name: '高一(2)班', grade: { id: 1, grade_name: '高一' } },
    dorm_room: null,
  },
  {
    id: '4', student_no: 'S2024004', name: '赵六', gender: 'FEMALE', phone: '13800138004',
    parent_name: '赵丽', parent_phone: '13900139004', boarding_type: 'BOARDING',
    dorm_room_id: 202, bed_no: 'A', status: 'LEFT_SCHOOL', class_id: 3, created_at: '2024-09-01T08:00:00Z',
    class: { id: 3, class_name: '高一(3)班', grade: { id: 1, grade_name: '高一' } },
    dorm_room: { id: 202, room_no: '202', floor: 2, building: { id: 2, building_name: '女生宿舍楼B' } },
  },
  {
    id: '5', student_no: 'S2024005', name: '钱七', gender: 'MALE', phone: '13800138005',
    parent_name: '钱进', parent_phone: '13900139005', boarding_type: 'BOARDING',
    dorm_room_id: 102, bed_no: 'C', status: 'SUSPENDED', class_id: 4, created_at: '2024-09-01T08:00:00Z',
    class: { id: 4, class_name: '高二(1)班', grade: { id: 2, grade_name: '高二' } },
    dorm_room: { id: 102, room_no: '102', floor: 1, building: { id: 1, building_name: '男生宿舍楼A' } },
  },
  {
    id: '6', student_no: 'S2024006', name: '孙八', gender: 'MALE', phone: '13800138006',
    parent_name: '孙力', parent_phone: '13900139006', boarding_type: 'DAY',
    dorm_room_id: null, bed_no: null, status: 'IN_SCHOOL', class_id: 2, created_at: '2024-09-01T08:00:00Z',
    class: { id: 2, class_name: '高一(2)班', grade: { id: 1, grade_name: '高一' } },
    dorm_room: null,
  },
  {
    id: '7', student_no: 'S2024007', name: '周九', gender: 'FEMALE', phone: '13800138007',
    parent_name: '周敏', parent_phone: '13900139007', boarding_type: 'BOARDING',
    dorm_room_id: 203, bed_no: 'B', status: 'IN_SCHOOL', class_id: 5, created_at: '2024-09-01T08:00:00Z',
    class: { id: 5, class_name: '高二(2)班', grade: { id: 2, grade_name: '高二' } },
    dorm_room: { id: 203, room_no: '203', floor: 2, building: { id: 2, building_name: '女生宿舍楼B' } },
  },
  {
    id: '8', student_no: 'S2024008', name: '吴十', gender: 'MALE', phone: '13800138008',
    parent_name: '吴刚', parent_phone: '13900139008', boarding_type: 'BOARDING',
    dorm_room_id: 103, bed_no: 'A', status: 'GRADUATED', class_id: 4, created_at: '2023-09-01T08:00:00Z',
    class: { id: 4, class_name: '高二(1)班', grade: { id: 2, grade_name: '高二' } },
    dorm_room: { id: 103, room_no: '103', floor: 1, building: { id: 1, building_name: '男生宿舍楼A' } },
  },
];

// ─── 大数据量辅助（用于性能测试） ──────────────────────
const NAMES = ['张三','李四','王五','赵六','钱七','孙八','周九','吴十','郑十一','冯十二',
  '陈十三','褚十四','卫十五','蒋十六','沈十七','韩十八','杨十九','朱二十','秦廿一','尤廿二',
  '许廿三','何廿四','吕廿五','施廿六','张廿七','孔廿八','曹廿九','严三十','华卅一','金卅二'];
const STATUS_LIST = ['IN_SCHOOL','IN_SCHOOL','IN_SCHOOL','PENDING_LEAVE','LEFT_SCHOOL','SUSPENDED','GRADUATED'];

/** 生成指定数量的 mock 学生（供 MSW handlers 使用） */
export function generateLargeStudentDataset(count: number): MockStudent[] {
  const result: MockStudent[] = [];
  for (let i = 0; i < count; i++) {
    const id = String(i + 9); // 从 9 开始避免与现有数据冲突
    const classId = (i % 8) + 1;
    const gender = i % 3 === 0 ? 'FEMALE' : 'MALE';
    const boarding = i % 4 === 0 ? 'DAY' : 'BOARDING';
    result.push({
      id,
      student_no: `S2024${String(i + 1).padStart(4, '0')}`,
      name: `${NAMES[i % NAMES.length]}${i > NAMES.length ? String(Math.floor(i / NAMES.length) + 1) : ''}`,
      gender,
      phone: `138${String(10000000 + i)}`,
      parent_name: null,
      parent_phone: null,
      boarding_type: boarding,
      dorm_room_id: boarding === 'BOARDING' ? (i % 3) + 1 : null,
      bed_no: boarding === 'BOARDING' ? ['A', 'B', 'C'][i % 3] : null,
      status: STATUS_LIST[i % STATUS_LIST.length],
      class_id: classId,
      created_at: '2024-09-01T08:00:00Z',
      class: { id: classId, class_name: `${['高一','高一','高一','高一','高一','高二','高二','高二'][classId - 1]}(${classId})班`, grade: { id: classId <= 5 ? 1 : 2, grade_name: classId <= 5 ? '高一' : '高二' } },
      dorm_room: boarding === 'BOARDING'
        ? { id: (i % 3) + 1, room_no: String((i % 3) + 1) + '0' + (i % 2 === 0 ? '1' : '2'), floor: (i % 2) + 1, building: { id: gender === 'MALE' ? 1 : 2, building_name: gender === 'MALE' ? '男生宿舍楼A' : '女生宿舍楼B' } }
        : null,
    });
  }
  return result;
}

// ─── Leaves ────────────────────────────────────────────
export const mockLeaves: MockLeave[] = [
  {
    id: '1', leave_no: 'L20240001', student_id: 1, student_name: '张三',
    leave_type: 'LEAVE_SCHOOL', leave_reason: '家中有事，需要回家', status: 'PENDING',
    start_time: '2024-12-20T08:00:00Z', end_time: '2024-12-21T18:00:00Z',
    approver_id: null, approver_name: null, approve_remark: null, reject_reason: null,
    created_at: '2024-12-18T10:00:00Z', updated_at: '2024-12-18T10:00:00Z',
    class_id: 1,
  },
  {
    id: '2', leave_no: 'L20240002', student_id: 2, student_name: '李四',
    leave_type: 'RETURN_DORM', leave_reason: '身体不舒服，需要回家休息', status: 'APPROVED',
    start_time: '2024-12-19T14:00:00Z', end_time: '2024-12-20T18:00:00Z',
    approver_id: 1, approver_name: '王老师', approve_remark: '注意安全', reject_reason: null,
    created_at: '2024-12-17T09:00:00Z', updated_at: '2024-12-17T15:00:00Z',
    class_id: 1,
  },
  {
    id: '3', leave_no: 'L20240003', student_id: 3, student_name: '王五',
    leave_type: 'OTHER', leave_reason: '去医院检查', status: 'LEFT',
    start_time: '2024-12-18T08:00:00Z', end_time: '2024-12-19T18:00:00Z',
    approver_id: 1, approver_name: '王老师', approve_remark: '同意', reject_reason: null,
    created_at: '2024-12-16T14:00:00Z', updated_at: '2024-12-18T08:00:00Z',
    class_id: 2,
  },
  {
    id: '4', leave_no: 'L20240004', student_id: 4, student_name: '赵六',
    leave_type: 'LEAVE_SCHOOL', leave_reason: '发烧需要回家', status: 'FINISHED',
    start_time: '2024-12-15T08:00:00Z', end_time: '2024-12-16T18:00:00Z',
    approver_id: 1, approver_name: '王老师', approve_remark: '好好休息', reject_reason: null,
    created_at: '2024-12-14T10:00:00Z', updated_at: '2024-12-16T18:00:00Z',
    class_id: 3,
  },
  {
    id: '5', leave_no: 'L20240005', student_id: 5, student_name: '钱七',
    leave_type: 'OTHER', leave_reason: '事假', status: 'REJECTED',
    start_time: '2024-12-22T08:00:00Z', end_time: '2024-12-23T18:00:00Z',
    approver_id: 1, approver_name: '王老师', approve_remark: null, reject_reason: '请假理由不充分',
    created_at: '2024-12-18T16:00:00Z', updated_at: '2024-12-18T17:00:00Z',
    class_id: 4,
  },
  {
    id: '6', leave_no: 'L20240006', student_id: 1, student_name: '张三',
    leave_type: 'RETURN_DORM', leave_reason: '参加校外竞赛', status: 'PENDING',
    start_time: '2024-12-25T08:00:00Z', end_time: '2024-12-25T18:00:00Z',
    approver_id: null, approver_name: null, approve_remark: null, reject_reason: null,
    created_at: '2024-12-19T08:00:00Z', updated_at: '2024-12-19T08:00:00Z',
    class_id: 1,
  },
];

// ─── Notices ───────────────────────────────────────────
export const mockNotices: MockNotice[] = [
  {
    id: '1', title: '关于期末考试安排的通知', content: '各位同学，期末考试将于2025年1月15日开始，请做好复习准备。',
    notice_type: 'EXAM', publish_scope: 'ALL', priority: 'HIGH', status: 'PUBLISHED',
    need_confirm: true, expired_at: '2025-01-20T23:59:59Z',
    publisher_id: 1, publisher_name: '教务处',
    is_read: false, created_at: '2024-12-18T09:00:00Z', updated_at: '2024-12-18T09:00:00Z',
  },
  {
    id: '2', title: '宿舍安全检查通知', content: '本周五将进行宿舍安全检查，请各宿舍提前整理。',
    notice_type: 'DORM', publish_scope: 'BOARDING', priority: 'URGENT', status: 'PUBLISHED',
    need_confirm: true, expired_at: null,
    publisher_id: 1, publisher_name: '宿管科',
    is_read: false, created_at: '2024-12-17T14:00:00Z', updated_at: '2024-12-17T14:00:00Z',
  },
  {
    id: '3', title: '元旦放假安排', content: '元旦放假时间为2024年12月30日至2025年1月1日。',
    notice_type: 'HOLIDAY', publish_scope: 'ALL', priority: 'NORMAL', status: 'PUBLISHED',
    need_confirm: false, expired_at: null,
    publisher_id: 1, publisher_name: '校办',
    is_read: true, created_at: '2024-12-15T10:00:00Z', updated_at: '2024-12-15T10:00:00Z',
  },
  {
    id: '4', title: '校运动会报名通知', content: '请各班于本周五前提交运动会报名表。',
    notice_type: 'ACTIVITY', publish_scope: 'ALL', priority: 'NORMAL', status: 'PUBLISHED',
    need_confirm: false, expired_at: '2024-12-25T23:59:59Z',
    publisher_id: 1, publisher_name: '体育组',
    is_read: true, created_at: '2024-12-10T08:00:00Z', updated_at: '2024-12-10T08:00:00Z',
  },
  {
    id: '5', title: '关于调整作息时间的通知（草稿）', content: '草稿内容...',
    notice_type: 'SYSTEM', publish_scope: 'ALL', priority: 'LOW', status: 'DRAFT',
    need_confirm: false, expired_at: null,
    publisher_id: 1, publisher_name: '校办',
    is_read: false, created_at: '2024-12-19T11:00:00Z', updated_at: '2024-12-19T11:00:00Z',
  },
];

// ─── Todos ─────────────────────────────────────────────
export const mockTodos: MockTodo[] = [
  {
    id: '1', todo_no: 'T20240001', title: '审批张三的请假申请', content: '请假类型：离校请假',
    teacher_id: 1, business_type: 'LEAVE', business_id: '1', priority: 'HIGH', status: 'TODO',
    deadline: '2024-12-19T18:00:00Z', finished_at: null, created_at: '2024-12-18T10:00:00Z',
    teacher: { id: 1, name: '王老师', teacher_no: 'T001' },
  },
  {
    id: '2', todo_no: 'T20240002', title: '审批李四的请假申请', content: '请假类型：回寝请假',
    teacher_id: 1, business_type: 'LEAVE', business_id: '2', priority: 'NORMAL', status: 'TODO',
    deadline: '2024-12-19T12:00:00Z', finished_at: null, created_at: '2024-12-17T09:00:00Z',
    teacher: { id: 1, name: '王老师', teacher_no: 'T001' },
  },
  {
    id: '3', todo_no: 'T20240003', title: '确认宿舍安全通知已阅读', content: '请确认阅读宿舍安全检查通知',
    teacher_id: 1, business_type: 'NOTICE', business_id: '2', priority: 'URGENT', status: 'TODO',
    deadline: '2024-12-20T08:00:00Z', finished_at: null, created_at: '2024-12-17T14:00:00Z',
    teacher: { id: 1, name: '王老师', teacher_no: 'T001' },
  },
  {
    id: '4', todo_no: 'T20240004', title: '完成学生信息录入', content: '录入新生信息',
    teacher_id: 1, business_type: 'SYSTEM', business_id: null, priority: 'NORMAL', status: 'DONE',
    deadline: null, finished_at: '2024-12-15T16:00:00Z', created_at: '2024-12-14T09:00:00Z',
    teacher: { id: 1, name: '王老师', teacher_no: 'T001' },
  },
  {
    id: '5', todo_no: 'T20240005', title: '处理王五离校确认', content: '学生已离校，请确认',
    teacher_id: 1, business_type: 'LEAVE', business_id: '3', priority: 'HIGH', status: 'PROCESSING',
    deadline: '2024-12-19T18:00:00Z', finished_at: null, created_at: '2024-12-18T08:00:00Z',
    teacher: { id: 1, name: '王老师', teacher_no: 'T001' },
  },
];
