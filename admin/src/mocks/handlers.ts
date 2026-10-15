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
    'student:qrcode:issue',
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
    'student:qrcode:issue',
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
// 前端矩阵 key -> 后端角色码（hasPermission / deriveDataScope 均按后端码判断）
const ROLE_TO_BACKEND: Record<string, string> = {
  SUPER_ADMIN: 'ROLE_ADMIN',
  GRADE_ADMIN: 'ROLE_GRADE_DIRECTOR',
  HEAD_TEACHER: 'ROLE_HEADMASTER',
  DORM_ADMIN: 'ROLE_DORM_MANAGER',
  TEACHER: 'ROLE_SUBJECT_TEACHER',
};

const authHandlers = [
  // 与前端 api/auth.ts loginWithPassword 真实端点一致（阶段 B3）
  http.post('/api/v1/auth/login-with-password', async ({ request }) => {
    const body = (await request.json()) as { role?: string; username?: string; password?: string };
    const roleKey = body.role || 'SUPER_ADMIN';
    const permissions = ROLE_PERMISSIONS[roleKey] ?? ROLE_PERMISSIONS.SUPER_ADMIN;
    const backendRole = ROLE_TO_BACKEND[roleKey] || 'ROLE_ADMIN';
    return HttpResponse.json({
      teacher: {
        id: '1',
        teacherNo: 'T001',
        name: `${ROLE_NAMES[roleKey] || roleKey}测试账号`,
      },
      roles: [backendRole],
      permissions,
      tags: [],
      token: 'mock-jwt-token-dev',
      refreshToken: 'mock-refresh-token-dev',
      expiresIn: '3600',
    });
  }),

  http.get('/api/v1/auth/me', () => {
    return HttpResponse.json({
      id: '1',
      teacherNo: 'T001',
      name: '王老师',
      gender: 'MALE',
      avatar: null,
      position: '班主任',
      roles: ['ROLE_ADMIN'],
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

// ─── Student Credential (身份二维码，F1) ───────────────
let credentialStore: Record<string, { hasActive: boolean; version: number; totalIssued: number }> = {};

const credentialHandlers = [
  http.get('/api/v1/student-credentials/students/:studentId', ({ params }) => {
    const id = params.studentId as string;
    const s = credentialStore[id] || { hasActive: false, version: 0, totalIssued: 0 };
    return HttpResponse.json({
      studentId: id,
      hasActive: s.hasActive,
      active: s.hasActive
        ? {
            id: 'mock',
            version: s.version,
            issuedBy: '1',
            issuedAt: new Date().toISOString(),
            lastVerifiedAt: null,
            lastVerifiedBy: null,
          }
        : null,
      totalIssued: s.totalIssued,
    });
  }),
  http.post('/api/v1/student-credentials', async ({ request }) => {
    const body = (await request.json()) as { studentId: string };
    const prev = credentialStore[body.studentId] || { hasActive: false, version: 0, totalIssued: 0 };
    const version = prev.hasActive ? prev.version + 1 : 1;
    credentialStore[body.studentId] = { hasActive: true, version, totalIssued: prev.totalIssued + 1 };
    return HttpResponse.json(
      { credentialId: 'mock', version, token: `mock-token-${Math.random().toString(36).slice(2)}` },
      { status: 201 },
    );
  }),
  http.delete('/api/v1/student-credentials/students/:studentId', ({ params }) => {
    const id = params.studentId as string;
    const prev = credentialStore[id] || { hasActive: false, version: 0, totalIssued: 0 };
    const revokedCount = prev.hasActive ? 1 : 0;
    credentialStore[id] = { ...prev, hasActive: false };
    return HttpResponse.json({ studentId: id, revokedCount });
  }),
];

// ─── RBAC (角色 / 权限) ───────────────────────────────
const allPermCodes = Array.from(new Set(Object.values(ROLE_PERMISSIONS).flat()));
const seededPermissions = allPermCodes.map((code, i) => ({
  id: i + 1,
  permissionCode: code,
  permissionName: code,
  resource: code.split(':')[0],
  action: code.split(':')[1] ?? null,
  description: null,
}));
const seededRoles: Array<{ id: number; roleCode: string; roleName: string; description: string | null }> =
  Object.keys(ROLE_PERMISSIONS).map((roleCode, i) => ({
    id: i + 1,
    roleCode,
    roleName: ROLE_NAMES[roleCode] || roleCode,
    description: null,
  }));
const rolePermMap: Record<string, typeof seededPermissions> = {};
seededRoles.forEach((r) => {
  const codes = ROLE_PERMISSIONS[r.roleCode] || [];
  rolePermMap[String(r.id)] = seededPermissions.filter((p) => codes.includes(p.permissionCode));
});

const rbacHandlers = [
  http.get('/api/v1/roles', () => {
    return HttpResponse.json({
      list: seededRoles,
      total: seededRoles.length,
      page: 1,
      pageSize: 100,
    });
  }),
  http.get('/api/v1/roles/:id/permissions', ({ params }) => {
    return HttpResponse.json(rolePermMap[params.id as string] || []);
  }),
  http.post('/api/v1/roles/:id/permissions', async ({ request, params }) => {
    const body = (await request.json()) as { permissionIds: number[] };
    rolePermMap[params.id as string] = seededPermissions.filter((p) => body.permissionIds.includes(p.id));
    return HttpResponse.json({ success: true });
  }),
  http.post('/api/v1/roles', async ({ request }) => {
    const body = (await request.json()) as { roleCode: string; roleName: string; description?: string };
    const role = {
      id: seededRoles.length + 1,
      roleCode: body.roleCode,
      roleName: body.roleName,
      description: body.description ?? null,
    };
    seededRoles.push(role);
    return HttpResponse.json(role, { status: 201 });
  }),
  http.delete('/api/v1/roles/:id', ({ params }) => {
    const idx = seededRoles.findIndex((r) => String(r.id) === params.id);
    if (idx >= 0) seededRoles.splice(idx, 1);
    return HttpResponse.json({ success: true });
  }),
  http.get('/api/v1/permissions', () => {
    return HttpResponse.json({
      list: seededPermissions,
      total: seededPermissions.length,
      page: 1,
      pageSize: 200,
    });
  }),
];

// ─── Teacher (教师管理) ────────────────────────────────
interface MockTeacher {
  id: string;
  teacherNo: string;
  name: string;
  gender: string;
  phone: string | null;
  email: string | null;
  avatar: string | null;
  teachingGroup: string | null;
  position: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const seedTeachers: MockTeacher[] = [
  {
    id: '1',
    teacherNo: 'T2024001',
    name: '张明',
    gender: 'MALE',
    phone: '13800000001',
    email: 'zhangming@school.edu',
    avatar: null,
    teachingGroup: '数学组',
    position: '年级主任',
    status: 'ACTIVE',
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: '2',
    teacherNo: 'T2024002',
    name: '李华',
    gender: 'FEMALE',
    phone: '13800000002',
    email: 'lihua@school.edu',
    avatar: null,
    teachingGroup: '语文组',
    position: '班主任',
    status: 'ACTIVE',
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: '3',
    teacherNo: 'T2024003',
    name: '王芳',
    gender: 'FEMALE',
    phone: '13800000003',
    email: 'wangfang@school.edu',
    avatar: null,
    teachingGroup: '英语组',
    position: '任课教师',
    status: 'ACTIVE',
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: '4',
    teacherNo: 'T2024004',
    name: '陈强',
    gender: 'MALE',
    phone: '13800000004',
    email: null,
    avatar: null,
    teachingGroup: '物理组',
    position: '任课教师',
    status: 'RESIGNED',
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  },
];

let teachers = [...seedTeachers];

// 教师 -> 角色码映射（与后端 teacher.service 同口径；初始仅给示例数据）
const teacherRoleMap: Record<string, string[]> = {
  '1': ['ROLE_GRADE_DIRECTOR'],
  '2': ['ROLE_HEADMASTER'],
  '3': ['ROLE_SUBJECT_TEACHER'],
  '4': ['ROLE_SUBJECT_TEACHER'],
};

const teacherHandlers = [
  http.get('/api/v1/teachers', ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') || '1');
    const pageSize = Number(url.searchParams.get('pageSize') || '10');
    const keyword = url.searchParams.get('keyword')?.toLowerCase();
    let filtered = [...teachers];
    if (keyword) {
      filtered = filtered.filter(
        (t) => t.name.toLowerCase().includes(keyword) || t.teacherNo.toLowerCase().includes(keyword),
      );
    }
    const start = (page - 1) * pageSize;
    const list = filtered.slice(start, start + pageSize);
    return HttpResponse.json({ list, total: filtered.length, page, pageSize });
  }),

  http.get('/api/v1/teachers/:id', ({ params }) => {
    const teacher = teachers.find((t) => t.id === params.id);
    if (!teacher) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    return HttpResponse.json(teacher);
  }),

  http.get('/api/v1/teachers/:id/roles', ({ params }) => {
    return HttpResponse.json({
      teacherId: params.id as string,
      roles: teacherRoleMap[params.id as string] || [],
    });
  }),

  http.post('/api/v1/teachers', async ({ request }) => {
    const body = (await request.json()) as {
      teacherNo: string;
      name: string;
      gender: string;
      phone?: string | null;
      email?: string | null;
      teachingGroup?: string | null;
      position?: string | null;
      status?: string;
    };
    const now = new Date().toISOString();
    const newTeacher: MockTeacher = {
      id: String(teachers.length + 1),
      teacherNo: body.teacherNo,
      name: body.name,
      gender: body.gender,
      phone: body.phone ?? null,
      email: body.email ?? null,
      avatar: null,
      teachingGroup: body.teachingGroup ?? null,
      position: body.position ?? null,
      status: body.status ?? 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };
    teachers = [newTeacher, ...teachers];
    return HttpResponse.json(newTeacher, { status: 201 });
  }),

  http.put('/api/v1/teachers/:id', async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const teacher = teachers.find((t) => t.id === params.id);
    if (!teacher) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    Object.assign(teacher, body);
    teacher.updatedAt = new Date().toISOString();
    return HttpResponse.json(teacher);
  }),

  http.post('/api/v1/teachers/:id/roles', async ({ request, params }) => {
    const body = (await request.json()) as { roleIds: number[] };
    const codes = body.roleIds
      .map((id) => seededRoles.find((r) => r.id === id)?.roleCode)
      .filter((c): c is string => typeof c === 'string');
    teacherRoleMap[params.id as string] = codes;
    return HttpResponse.json({ success: true, teacherId: params.id as string, roles: codes });
  }),

  http.post('/api/v1/teachers/:id/bind-wechat/init', ({ params }) => {
    const token = `BIND-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    return HttpResponse.json({ bindingToken: token, expiresIn: 600, teacherId: params.id as string });
  }),
];

export const handlers = [
  ...errorHandlers,
  ...authHandlers,
  ...statisticsHandlers,
  ...todoHandlers,
  ...leaveHandlers,
  ...noticeHandlers,
  ...studentHandlers,
  ...credentialHandlers,
  ...teacherHandlers,
  ...rbacHandlers,
];
