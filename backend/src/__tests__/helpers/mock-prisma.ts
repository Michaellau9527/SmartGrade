/**
 * Mock Prisma Client 工厂 + 自动 mock 注入
 *
 * 关键：jest.mock 工厂返回的模块里 prisma 是个 getter，
 * 这样在 beforeEach 里替换 mockPrismaInstance 后，
 * BaseRepository 通过 import 拿到的 prisma 也是新的。
 */

export type MockPrisma = any;

let mockPrismaInstance: MockPrisma | null = null;

function createMockMethod(): jest.Mock {
  return jest.fn().mockImplementation(() => {
    throw new Error('Mock not configured for this method');
  });
}

function createMockTable(): any {
  return new Proxy({}, {
    get(target, prop) {
      if (typeof prop === 'symbol' || prop === 'then') return undefined;
      if (!(prop in target)) target[prop] = createMockMethod();
      return target[prop];
    },
  });
}

export function createMockPrisma(): MockPrisma {
  return {
    $transaction: jest.fn(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    school: createMockTable(),
    grade: createMockTable(),
    class: createMockTable(),
    teacher: createMockTable(),
    student: createMockTable(),
    parent: createMockTable(),
    studentParent: createMockTable(),
    user: createMockTable(),
    userIdentity: createMockTable(),
    dormBuilding: createMockTable(),
    dormRoom: createMockTable(),
    teacherClassRelation: createMockTable(),
    leaveRecord: createMockTable(),
    notice: createMockTable(),
    noticeRead: createMockTable(),
    task: createMockTable(),
    timelineEvent: createMockTable(),
  };
}

export function setMockPrisma(mock: MockPrisma) {
  mockPrismaInstance = mock;
}

export function getMockPrisma(): MockPrisma {
  if (!mockPrismaInstance) mockPrismaInstance = createMockPrisma();
  return mockPrismaInstance;
}

/**
 * 安装自动 jest.mock 钩子（必须在被测模块 import 之前调用）
 *
 * 提供 prisma 的 getter，让测试可以随时替换 mock 实例
 */
export function setupPrismaMock() {
  jest.mock('../../db/prisma.client', () => ({
    get prisma() {
      return getMockPrisma();
    },
  }));
}

/**
 * 假数据
 */
export function fakeStudent(overrides: Partial<any> = {}): any {
  return {
    id: 'stu_test_001',
    studentNo: 'S20260001',
    name: '张三',
    gender: 'MALE',
    classId: 'cls_test_001',
    gradeId: 'grade_test_001',
    schoolId: 'sch_test_001',
    boardingType: 'BOARDING',
    dormId: 'dorm_test_001',
    bedNo: 'A-12',
    currentStatus: 'ON_CAMPUS',
    currentLocation: 'UNKNOWN',
    statusUpdatedAt: null,
    locationUpdatedAt: null,
    phone: null,
    enrolledAt: new Date('2026-09-01'),
    graduatedAt: null,
    transferredAt: null,
    createdAt: new Date('2026-09-01'),
    updatedAt: new Date('2026-09-01'),
    deletedAt: null,
    ...overrides,
  };
}

export function fakeLeave(overrides: Partial<any> = {}): any {
  return {
    id: 'leave_test_001',
    leaveNo: 'LV20260901001',
    studentId: 'stu_test_001',
    studentName: '张三',
    classId: 'cls_test_001',
    className: '高一(1)班',
    gradeId: 'grade_test_001',
    schoolId: 'sch_test_001',
    leaveType: 'SICK',
    leaveReasonType: 'ILLNESS',
    reason: '感冒发烧',
    startAt: new Date('2026-09-01T09:00:00'),
    endAt: new Date('2026-09-01T14:00:00'),
    expectedReturnTime: new Date('2026-09-01T14:30:00'),
    expectedReturnNote: null,
    actualLeftAt: null,
    actualReturnedAt: null,
    closedAt: null,
    status: 'DRAFT',
    applicantId: 'teacher_test_001',
    applicantName: '李老师',
    approverId: null,
    approverName: null,
    approveRemark: null,
    approvedAt: null,
    rejectReason: null,
    rejectedAt: null,
    cancelReason: null,
    returnJudgment: null,
    attachmentIds: [],
    createdAt: new Date('2026-09-01T08:00:00'),
    updatedAt: new Date('2026-09-01T08:00:00'),
    deletedAt: null,
    ...overrides,
  };
}

export function fakeTimelineEvent(overrides: Partial<any> = {}): any {
  return {
    id: 'tl_test_001',
    eventType: 'LEAVE_CREATED',
    eventSource: 'LEAVE',
    sourceEventId: 'leave_test_001',
    studentId: 'stu_test_001',
    operatorId: 'teacher_test_001',
    operatorName: '李老师',
    operatorRole: 'APPLICANT',
    metadata: {},
    occurredAt: new Date('2026-09-01T08:00:00'),
    classId: 'cls_test_001',
    gradeId: 'grade_test_001',
    schoolId: 'sch_test_001',
    relatedType: 'LEAVE',
    relatedId: 'leave_test_001',
    leaveRecordId: 'leave_test_001',
    noticeId: null,
    isSystem: false,
    createdAt: new Date('2026-09-01T08:00:00'),
    ...overrides,
  };
}
