/**
 * MSW Mock Handlers
 * 覆盖所有 API 端点，开发环境自动拦截
 */
import { http, HttpResponse } from 'msw';
import { mockStudents, mockLeaves, mockNotices, mockTodos } from './data';

// ─── 角色权限映射（与前端 auth/roles.ts 保持一致） ─────
const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: [
    'todo:read', 'todo:complete',
    'leave:create', 'leave:read', 'leave:approve', 'leave:update', 'leave:finish',
    'notice:read', 'notice:create', 'notice:update', 'notice:delete',
    'student:read', 'student:create', 'student:update', 'student:delete',
    'teacher:read', 'teacher:create', 'teacher:update', 'teacher:delete',
    'statistics:read', 'dorm:read', 'dorm:check',
    'permission:create', 'permission:update', 'permission:delete',
    'role:create', 'role:update', 'role:delete', 'role:assign-permission',
  ],
  GRADE_ADMIN: [
    'statistics:read',
    'todo:read', 'todo:complete',
    'notice:read', 'notice:create', 'notice:update', 'notice:delete',
    'leave:create', 'leave:read', 'leave:approve', 'leave:update', 'leave:finish',
    'student:read', 'student:create', 'student:update', 'student:delete',
    'teacher:read',
    'dorm:read',
  ],
  HEAD_TEACHER: [
    'statistics:read',
    'todo:read', 'todo:complete',
    'notice:read',
    'leave:create', 'leave:read', 'leave:approve', 'leave:update', 'leave:finish',
    'student:read', 'student:create', 'student:update', 'student:delete',
  ],
  DORM_ADMIN: [
    'statistics:read',
    'todo:read', 'todo:complete',
    'leave:read',
    'student:read', 'student:update',
    'dorm:read', 'dorm:check',
  ],
  TEACHER: [
    'statistics:read',
    'todo:read', 'todo:complete',
    'notice:read',
    'leave:read', 'leave:create',
    'student:read',
  ],
};

const ROLE_DATA_SCOPE: Record<string, string> = {
  SUPER_ADMIN: 'ALL',
  GRADE_ADMIN: 'GRADE',
  HEAD_TEACHER: 'CLASS',
  DORM_ADMIN: 'DORM',
  TEACHER: 'SELF',
};

const ROLE_NAMES: Record<string, string> = {
  SUPER_ADMIN: '超级管理员',
  GRADE_ADMIN: '年级主任',
  HEAD_TEACHER: '班主任',
  DORM_ADMIN: '宿管老师',
  TEACHER: '普通教师',
};

// 可变数据副本（支持增删改）
let students = [...mockStudents];
let leaves = [...mockLeaves];
let notices = [...mockNotices];
const todos = [...mockTodos];

// ─── Auth ──────────────────────────────────────────────
const authHandlers = [
  http.post('/api/v1/auth/login', async ({ request }) => {
    const body = (await request.json()) as { role?: string };
    const role = body.role || 'SUPER_ADMIN';
    const permissions = ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.SUPER_ADMIN;
    return HttpResponse.json({
      access_token: 'mock-jwt-token-dev',
      user: {
        id: 1,
        name: `${ROLE_NAMES[role] || role}测试账号`,
        teacher_no: 'T001',
        roles: [role],
        permissions,
        dataScope: { type: ROLE_DATA_SCOPE[role] || 'SELF' },
      },
    });
  }),

  http.get('/api/v1/auth/me', () => {
    return HttpResponse.json({
      id: 1,
      name: '王老师',
      teacher_no: 'T001',
      roles: ['SUPER_ADMIN'],
      permissions: ROLE_PERMISSIONS.SUPER_ADMIN,
      dataScope: { type: 'ALL' },
    });
  }),
];

// ─── 数据过滤辅助（模拟后端 DataScope） ───────────────
/**
 * 从请求头中提取当前角色
 */
function getRole(request: Request): string {
  return request.headers.get('X-Mock-Role') || 'SUPER_ADMIN';
}

/**
 * 模拟 DataScope 数据过滤
 * - SUPER_ADMIN: 返回全部
 * - GRADE_ADMIN: 返回 class_id 为 1-5 的数据（模拟某年级）
 * - HEAD_TEACHER: 返回 class_id === 1 的数据（模拟某班）
 * - DORM_ADMIN: 返回 boarding_type === 'BOARDING' 的学生
 * - TEACHER: 返回 teacher_id === 1 的数据（自己的待办）或 class_id === 1,2（自己任课班级）
 */
function filterByDataScope<T extends Record<string, unknown>>(
  items: T[],
  role: string,
  scopeField: string = 'class_id',
): T[] {
  switch (role) {
    case 'SUPER_ADMIN':
      return items;
    case 'GRADE_ADMIN':
      // 模拟：年级主任看到 class_id 1-5（某年级）
      return items.filter((item) => {
        const val = item[scopeField];
        return val === 1 || val === 2 || val === 3 || val === 4 || val === 5;
      });
    case 'HEAD_TEACHER':
      // 模拟：班主任只看到 class_id === 1（某班）
      return items.filter((item) => item[scopeField] === 1);
    case 'DORM_ADMIN':
      // 宿管只看到住校生（通过 boarding_type 过滤）
      return items.filter((item) => item.boarding_type === 'BOARDING');
    case 'TEACHER':
      // 普通教师：
      //   - 如果 scopeField === 'teacher_id'（Todo 等），只看自己的
      //   - 如果 scopeField === 'class_id'（Student/Leave），只看自己任课班级（模拟 1 和 2）
      if (scopeField === 'teacher_id') {
        return items.filter((item) => item.teacher_id === 1);
      }
      // Student/Leave: 只看自己任课班级
      return items.filter((item) => {
        const val = item[scopeField];
        return val === 1 || val === 2;
      });
    default:
      return items;
  }
}

// ─── Statistics (Dashboard) ────────────────────────────
const statisticsHandlers = [
  http.get('/api/v1/statistics/overview', () => {
    return HttpResponse.json({
      totalStudents: students.length,
      inSchool: students.filter((s) => s.status === 'IN_SCHOOL').length,
      leftSchool: students.filter((s) => s.status === 'LEFT_SCHOOL').length,
      pendingLeave: leaves.filter((l) => l.status === 'PENDING').length,
      todayLeaves: leaves.filter(
        (l) => new Date(l.created_at).toDateString() === new Date().toDateString(),
      ).length,
      unreadNotices: notices.filter((n) => !n.is_read && n.status === 'PUBLISHED').length,
      todoCount: todos.filter((t) => t.status === 'TODO' || t.status === 'PROCESSING').length,
    });
  }),

  http.get('/api/v1/statistics/recent-leaves', () => {
    const recent = [...leaves]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map((l) => ({
        id: l.id,
        leave_no: l.leave_no,
        student_name: l.student_name,
        leave_type: l.leave_type,
        status: l.status,
        created_at: l.created_at,
      }));
    return HttpResponse.json(recent);
  }),

  http.get('/api/v1/statistics/recent-notices', () => {
    const recent = [...notices]
      .filter((n) => n.status === 'PUBLISHED')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map((n) => ({
        id: n.id,
        title: n.title,
        priority: n.priority,
        created_at: n.created_at,
        publisher_name: n.publisher_name,
      }));
    return HttpResponse.json(recent);
  }),

  http.get('/api/v1/statistics/recent-timeline', () => {
    return HttpResponse.json([]);
  }),
];

// ─── Todo ──────────────────────────────────────────────
const todoHandlers = [
  http.get('/api/v1/todos', ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') || '1');
    const pageSize = Number(url.searchParams.get('pageSize') || '10');
    const role = getRole(request);

    const scopeFiltered = filterByDataScope([...todos], role, 'teacher_id');
    const start = (page - 1) * pageSize;
    const list = scopeFiltered.slice(start, start + pageSize);
    return HttpResponse.json({
      list,
      total: scopeFiltered.length,
      page,
      pageSize,
    });
  }),

  http.get('/api/v1/todos/statistics', () => {
    return HttpResponse.json({
      total: todos.length,
      todo: todos.filter((t) => t.status === 'TODO').length,
      processing: todos.filter((t) => t.status === 'PROCESSING').length,
      done: todos.filter((t) => t.status === 'DONE').length,
    });
  }),

  http.get('/api/v1/todos/:id', ({ params }) => {
    const todo = todos.find((t) => t.id === params.id);
    if (!todo) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    return HttpResponse.json(todo);
  }),

  http.post('/api/v1/todos/:id/complete', ({ params }) => {
    const todo = todos.find((t) => t.id === params.id);
    if (!todo) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    todo.status = 'DONE';
    todo.finished_at = new Date().toISOString();
    return HttpResponse.json(todo);
  }),

  http.post('/api/v1/todos/batch-complete', async ({ request }) => {
    const body = (await request.json()) as { ids: number[] };
    let count = 0;
    for (const id of body.ids) {
      const todo = todos.find((t) => t.id === String(id));
      if (todo) {
        todo.status = 'DONE';
        todo.finished_at = new Date().toISOString();
        count++;
      }
    }
    return HttpResponse.json({ success: true, updatedCount: count });
  }),
];

// ─── Leave ─────────────────────────────────────────────
const leaveHandlers = [
  http.get('/api/v1/leaves', ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') || '1');
    const pageSize = Number(url.searchParams.get('pageSize') || '10');
    const status = url.searchParams.get('status');
    const leaveType = url.searchParams.get('leaveType');
    const role = getRole(request);

    let filtered = filterByDataScope([...leaves], role);
    if (status) filtered = filtered.filter((l) => l.status === status);
    if (leaveType) filtered = filtered.filter((l) => l.leave_type === leaveType);

    const start = (page - 1) * pageSize;
    const list = filtered.slice(start, start + pageSize);
    return HttpResponse.json({
      list,
      total: filtered.length,
      page,
      pageSize,
    });
  }),

  http.get('/api/v1/leaves/today', () => {
    const today = new Date().toDateString();
    const list = leaves.filter(
      (l) => new Date(l.created_at).toDateString() === today,
    );
    return HttpResponse.json({ list, total: list.length });
  }),

  http.get('/api/v1/leaves/history', ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') || '1');
    const pageSize = Number(url.searchParams.get('pageSize') || '10');
    const start = (page - 1) * pageSize;
    const list = leaves.slice(start, start + pageSize);
    return HttpResponse.json({ list, total: leaves.length, page, pageSize });
  }),

  http.get('/api/v1/leaves/:id', ({ params }) => {
    const leave = leaves.find((l) => l.id === params.id);
    if (!leave) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    return HttpResponse.json(leave);
  }),

  http.post('/api/v1/leaves', async ({ request }) => {
    const body = (await request.json()) as {
      studentId: number;
      leaveType: string;
      leaveReason: string;
      remark?: string;
    };
    const student = students.find((s) => s.id === String(body.studentId));
    const newLeave = {
      id: String(leaves.length + 1),
      leave_no: `L2024${String(leaves.length + 1).padStart(5, '0')}`,
      student_id: body.studentId,
      student_name: student?.name || '未知',
      leave_type: body.leaveType,
      leave_reason: body.leaveReason,
      status: 'PENDING',
      start_time: '',
      end_time: '',
      approver_id: null,
      approver_name: null,
      approve_remark: null,
      reject_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      class_id: student?.class_id || 0,
    };
    leaves = [newLeave, ...leaves];
    return HttpResponse.json(newLeave, { status: 201 });
  }),

  http.post('/api/v1/leaves/:id/approve', async ({ request, params }) => {
    const body = (await request.json()) as { approveRemark?: string };
    const leave = leaves.find((l) => l.id === params.id);
    if (!leave) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    leave.status = 'APPROVED';
    leave.approver_id = 1;
    leave.approver_name = '王老师';
    leave.approve_remark = body.approveRemark || null;
    leave.updated_at = new Date().toISOString();
    return HttpResponse.json(leave);
  }),

  http.post('/api/v1/leaves/:id/reject', async ({ request, params }) => {
    const body = (await request.json()) as { rejectReason: string };
    const leave = leaves.find((l) => l.id === params.id);
    if (!leave) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    leave.status = 'REJECTED';
    leave.approver_id = 1;
    leave.approver_name = '王老师';
    leave.reject_reason = body.rejectReason;
    leave.updated_at = new Date().toISOString();
    return HttpResponse.json(leave);
  }),

  http.post('/api/v1/leaves/:id/confirm-left', ({ params }) => {
    const leave = leaves.find((l) => l.id === params.id);
    if (!leave) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    leave.status = 'LEFT';
    leave.updated_at = new Date().toISOString();
    return HttpResponse.json(leave);
  }),

  http.post('/api/v1/leaves/:id/finish', ({ params }) => {
    const leave = leaves.find((l) => l.id === params.id);
    if (!leave) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    leave.status = 'FINISHED';
    leave.updated_at = new Date().toISOString();
    return HttpResponse.json(leave);
  }),
];

// ─── Notice ────────────────────────────────────────────
const noticeHandlers = [
  http.get('/api/v1/notices', ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') || '1');
    const pageSize = Number(url.searchParams.get('pageSize') || '10');
    const status = url.searchParams.get('status');
    const noticeType = url.searchParams.get('noticeType');
    const priority = url.searchParams.get('priority');

    let filtered = [...notices];
    if (status) filtered = filtered.filter((n) => n.status === status);
    if (noticeType) filtered = filtered.filter((n) => n.notice_type === noticeType);
    if (priority) filtered = filtered.filter((n) => n.priority === priority);

    const start = (page - 1) * pageSize;
    const list = filtered.slice(start, start + pageSize);
    return HttpResponse.json({
      list,
      total: filtered.length,
      page,
      pageSize,
    });
  }),

  http.get('/api/v1/notices/unread', () => {
    const unread = notices.filter((n) => !n.is_read && n.status === 'PUBLISHED');
    return HttpResponse.json(unread);
  }),

  http.get('/api/v1/notices/:id/reads', () => {
    return HttpResponse.json({
      total: 156,
      read: 120,
      unread: 36,
      readList: [],
    });
  }),

  http.get('/api/v1/notices/:id', ({ params }) => {
    const notice = notices.find((n) => n.id === params.id);
    if (!notice) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    // 自动标记已读
    notice.is_read = true;
    return HttpResponse.json(notice);
  }),

  http.post('/api/v1/notices', async ({ request }) => {
    const body = (await request.json()) as {
      title: string;
      content: string;
      noticeType: string;
      publishScope: string;
      priority?: string;
      needConfirm?: boolean;
      expiredAt?: string;
    };
    const newNotice = {
      id: String(notices.length + 1),
      title: body.title,
      content: body.content,
      notice_type: body.noticeType,
      publish_scope: body.publishScope,
      priority: body.priority || 'NORMAL',
      status: 'PUBLISHED',
      need_confirm: body.needConfirm || false,
      expired_at: body.expiredAt || null,
      publisher_id: 1,
      publisher_name: '王老师',
      is_read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    notices = [newNotice, ...notices];
    return HttpResponse.json(newNotice, { status: 201 });
  }),

  http.put('/api/v1/notices/:id', async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const notice = notices.find((n) => n.id === params.id);
    if (!notice) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    Object.assign(notice, body);
    notice.updated_at = new Date().toISOString();
    return HttpResponse.json(notice);
  }),

  http.delete('/api/v1/notices/:id', ({ params }) => {
    const idx = notices.findIndex((n) => n.id === params.id);
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    notices.splice(idx, 1);
    return HttpResponse.json({ success: true });
  }),

  http.post('/api/v1/notices/:id/withdraw', ({ params }) => {
    const notice = notices.find((n) => n.id === params.id);
    if (!notice) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    notice.status = 'WITHDRAWN';
    notice.updated_at = new Date().toISOString();
    return HttpResponse.json(notice);
  }),

  http.post('/api/v1/notices/:id/confirm', ({ params }) => {
    const notice = notices.find((n) => n.id === params.id);
    if (!notice) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    return HttpResponse.json({ success: true, confirmed_at: new Date().toISOString() });
  }),
];

// ─── Student ───────────────────────────────────────────
const studentHandlers = [
  http.get('/api/v1/students', ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') || '1');
    const pageSize = Number(url.searchParams.get('pageSize') || '10');
    const status = url.searchParams.get('status');
    const boardingType = url.searchParams.get('boardingType');
    const keyword = url.searchParams.get('keyword')?.toLowerCase();
    const role = getRole(request);

    let filtered = filterByDataScope([...students], role);
    if (status) filtered = filtered.filter((s) => s.status === status);
    if (boardingType) filtered = filtered.filter((s) => s.boarding_type === boardingType);
    if (keyword) {
      filtered = filtered.filter(
        (s) => s.name.toLowerCase().includes(keyword) || s.student_no.toLowerCase().includes(keyword),
      );
    }

    const start = (page - 1) * pageSize;
    const list = filtered.slice(start, start + pageSize);
    return HttpResponse.json({
      list,
      total: filtered.length,
      page,
      pageSize,
    });
  }),

  http.get('/api/v1/students/:id', ({ params }) => {
    const student = students.find((s) => s.id === params.id);
    if (!student) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    return HttpResponse.json(student);
  }),

  http.post('/api/v1/students', async ({ request }) => {
    const body = (await request.json()) as {
      student_no: string;
      name: string;
      gender: string;
      class_id: number;
      boarding_type: string;
      dorm_room_id?: number;
      bed_no?: string;
      phone?: string;
      parent_name?: string;
      parent_phone?: string;
    };
    const newStudent = {
      id: String(students.length + 1),
      student_no: body.student_no,
      name: body.name,
      gender: body.gender,
      class_id: body.class_id,
      boarding_type: body.boarding_type,
      dorm_room_id: body.dorm_room_id || 0,
      bed_no: body.bed_no || '',
      phone: body.phone || '',
      parent_name: body.parent_name || '',
      parent_phone: body.parent_phone || '',
      status: 'IN_SCHOOL',
      created_at: new Date().toISOString(),
      class: { id: body.class_id, class_name: `高一(${body.class_id})班`, grade: { id: 1, grade_name: '高一' } },
      dorm_room: body.dorm_room_id
        ? { id: body.dorm_room_id, room_no: String(body.dorm_room_id), floor: 1, building: { id: 1, building_name: '宿舍楼' } }
        : null,
    };
    students = [newStudent, ...students];
    return HttpResponse.json(newStudent, { status: 201 });
  }),

  http.put('/api/v1/students/:id', async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const student = students.find((s) => s.id === params.id);
    if (!student) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    Object.assign(student, body);
    return HttpResponse.json(student);
  }),

  http.delete('/api/v1/students/:id', ({ params }) => {
    const idx = students.findIndex((s) => s.id === params.id);
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    students.splice(idx, 1);
    return HttpResponse.json({ success: true });
  }),

  http.post('/api/v1/students/:id/dormitory', async ({ request, params }) => {
    const body = (await request.json()) as { dorm_room_id: number; bed_no: string };
    const student = students.find((s) => s.id === params.id);
    if (!student) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    student.dorm_room_id = body.dorm_room_id;
    student.bed_no = body.bed_no;
    student.boarding_type = 'BOARDING';
    return HttpResponse.json(student);
  }),
];

// ─── 导出所有 handlers ─────────────────────────────────
// ─── 异常 Mock（通过 X-Mock-Error header 触发） ──────────
// 用法：在浏览器 console 中执行：
//   localStorage.setItem('mock_error', '500');
//   刷新页面即可触发对应错误
//   清除：localStorage.removeItem('mock_error');

// 通用异常拦截器（放在所有 handler 之前，不匹配时自动穿透）
const errorHandlers = [
  http.all('/api/v1/:path*', ({ request }) => {
    const mockError = request.headers.get('X-Mock-Error');
    if (mockError) {
      const code = Number(mockError);
      if (code === 401) {
        return HttpResponse.json({ message: 'Token expired' }, { status: 401 });
      }
      if (code === 403) {
        return HttpResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
      if (code === 404) {
        return HttpResponse.json({ message: 'Not found' }, { status: 404 });
      }
      if (code >= 500) {
        return HttpResponse.json({ message: 'Internal Server Error' }, { status: 500 });
      }
    }
    // Empty 模拟（X-Mock-Empty: 1 返回空列表）
    const empty = request.headers.get('X-Mock-Empty');
    if (empty === '1') {
      return HttpResponse.json({ list: [], total: 0, page: 1, pageSize: 10 });
    }
  }),
];

// 更新 request.ts 在开发环境下注入异常 header
// 这样可以通过 localStorage 控制异常模拟

export const handlers = [
  ...errorHandlers,
  ...authHandlers,
  ...statisticsHandlers,
  ...todoHandlers,
  ...leaveHandlers,
  ...noticeHandlers,
  ...studentHandlers,
];
