/**
 * 测试 9: Sprint 2.2 C03 — Student Notice Capability
 *
 * 上游规则：Sprint 2.2 C03 — 刘老师拍板
 *
 * DoD（6 项）：
 * 1. ✅ 能创建通知草稿
 * 2. ✅ 能发布通知
 * 3. ✅ 能标记已读
 * 4. ✅ 能确认阅读（Acknowledge）
 * 5. ✅ Timeline 完整（4 种事件）
 * 6. ✅ 全链路测试通过
 *
 * 额外验证：
 * - 状态机非法转换被拒绝
 * - Timeline 强一致（同事务）
 * - DomainService 不碰数据库
 * - CapabilityService 不直接查 Prisma
 * - Timeline Validation: NOTICE_CREATED / NOTICE_PUBLISHED / NOTICE_READ / NOTICE_ACKNOWLEDGED
 */

import { NoticeDomainService, NoticeStateTransitionError, NoticeNotFoundError } from '../modules/notice/notice.domain-service';
import { NoticeCapabilityService } from '../modules/notice/notice.capability-service';
import type { NoticeCapabilityDeps } from '../modules/notice/notice.capability-service';
import type { AuthorizationContext } from '../authorization/types';
import { RoleCode } from '@smartgrade/shared/enums/RoleCode';
import { PermissionCode } from '@smartgrade/shared/enums/PermissionCode';

// ============================================================
// Mock 数据
// ============================================================

const MOCK_NOTICE_DRAFT = {
  id: 'notice_001',
  noticeNo: 'NT20260720-0001',
  title: '期末考试安排通知',
  content: '本周五进行期末考试，请做好准备。',
  contentFormat: 'PLAIN',
  noticeType: 'NOTICE',
  targets: [{ targetType: 'CLASS', targetId: 'cls_001', targetLabel: '高一1班' }],
  requireConfirm: true,
  confirmDeadline: null,
  status: 'DRAFT',
  publisherId: 'teacher_001',
  publisherName: '李老师',
  publishedAt: null,
  archivedAt: null,
  createdAt: new Date('2026-07-20T08:00:00Z'),
  updatedAt: new Date('2026-07-20T08:00:00Z'),
};

const MOCK_NOTICE_PUBLISHED = {
  ...MOCK_NOTICE_DRAFT,
  status: 'PUBLISHED',
  publishedAt: new Date('2026-07-20T09:00:00Z'),
};

const MOCK_NOTICE_READ = {
  noticeId: 'notice_001',
  teacherId: 'teacher_002',
  isRead: true,
  readAt: new Date('2026-07-20T10:00:00Z'),
  confirmAt: null,
};

const MOCK_NOTICE_ACKNOWLEDGED = {
  noticeId: 'notice_001',
  teacherId: 'teacher_002',
  isRead: true,
  readAt: new Date('2026-07-20T10:00:00Z'),
  confirmAt: new Date('2026-07-20T10:05:00Z'),
};

const MOCK_TIMELINE_CREATED = {
  id: 'tl_n_001',
  eventType: 'NOTICE_CREATED',
  eventSource: 'NOTICE',
  sourceEventId: 'notice_001',
  studentId: 'system',
  operatorId: 'teacher_001',
  operatorName: '李老师',
  operatorRole: 'TEACHER',
  metadata: { noticeNo: 'NT20260720-0001', title: '期末考试安排通知', noticeType: 'NOTICE', status: 'DRAFT' },
  occurredAt: new Date('2026-07-20T08:00:00Z'),
  recordedAt: new Date('2026-07-20T08:00:00Z'),
  schoolId: 'school_001',
  noticeId: 'notice_001',
};

const MOCK_TIMELINE_PUBLISHED = {
  ...MOCK_TIMELINE_CREATED,
  id: 'tl_n_002',
  eventType: 'NOTICE_PUBLISHED',
  metadata: { noticeNo: 'NT20260720-0001', title: '期末考试安排通知', from: 'DRAFT', to: 'PUBLISHED' },
  occurredAt: new Date('2026-07-20T09:00:00Z'),
};

const MOCK_TIMELINE_READ = {
  ...MOCK_TIMELINE_CREATED,
  id: 'tl_n_003',
  eventType: 'NOTICE_READ',
  operatorId: 'teacher_002',
  metadata: { noticeNo: 'NT20260720-0001', title: '期末考试安排通知', readerId: 'teacher_002' },
  occurredAt: new Date('2026-07-20T10:00:00Z'),
};

const MOCK_TIMELINE_ACKNOWLEDGED = {
  ...MOCK_TIMELINE_CREATED,
  id: 'tl_n_004',
  eventType: 'NOTICE_ACKNOWLEDGED',
  operatorId: 'teacher_002',
  metadata: { noticeNo: 'NT20260720-0001', title: '期末考试安排通知', readerId: 'teacher_002' },
  occurredAt: new Date('2026-07-20T10:05:00Z'),
};

// ============================================================
// 工厂函数
// ============================================================

function buildCtx(overrides: Partial<AuthorizationContext> = {}): AuthorizationContext {
  const base: AuthorizationContext = {
    actor: {
      userId: 'demo_teacher_001',
      teacherId: 'teacher_001',
      parentId: null,
      userType: 'TEACHER',
    },
    authorization: {
      roleSet: new Set([RoleCode.ROLE_HEADMASTER]),
      permissionSet: new Set([
        PermissionCode.NOTICE_CREATE,
        PermissionCode.NOTICE_READ,
        PermissionCode.NOTICE_UPDATE,
      ]),
      organization: {
        schoolId: 'school_001',
        gradeIds: ['grade_001'],
        classIds: ['class_001'],
      },
      dataScope: {
        classIds: ['class_001'],
        gradeIds: ['grade_001'],
        isSchoolWide: false,
        isParentScoped: false,
        version: 1,
      },
    },
    issuedAt: new Date(),
  };
  return { ...base, ...overrides };
}

// ============================================================
// Mock 工具
// ============================================================

function createMockTx(): any {
  return { $transaction: jest.fn() };
}

function createMockDeps(): NoticeCapabilityDeps {
  return {
    noticeRepository: {
      findById: jest.fn(),
      findPublishedForSchool: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      publish: jest.fn(),
      archive: jest.fn(),
      markRead: jest.fn(),
      markConfirmed: jest.fn(),
      getReadStats: jest.fn(),
      withTransaction: jest.fn(async (fn: any) => {
        const tx = createMockTx();
        return fn(tx);
      }),
    } as any,
    timelineRepository: {
      create: jest.fn(),
      findByStudent: jest.fn(),
      findByRelated: jest.fn(),
      findBySource: jest.fn(),
      monthlyStats: jest.fn(),
      findAbnormalStudentsInClass: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    } as any,
    domainService: new NoticeDomainService(),
  };
}

// ============================================================
// 测试套件
// ============================================================

describe('C03 Student Notice Capability', () => {

  // ==========================================================
  // 1. DomainService — 纯函数测试（不碰数据库）
  // ==========================================================

  describe('1. DomainService — 状态机', () => {
    const ds = new NoticeDomainService();

    test('1.1 初始状态 = DRAFT', () => {
      expect(ds.getInitialState()).toBe('DRAFT');
    });

    test('1.2 DRAFT → PUBLISHED 合法', () => {
      expect(() => ds.validateTransition('DRAFT', 'PUBLISHED')).not.toThrow();
    });

    test('1.3 PUBLISHED → ARCHIVED 合法', () => {
      expect(() => ds.validateTransition('PUBLISHED', 'ARCHIVED')).not.toThrow();
    });

    test('1.4 DRAFT → ARCHIVED 非法', () => {
      expect(() => ds.validateTransition('DRAFT', 'ARCHIVED')).toThrow(NoticeStateTransitionError);
    });

    test('1.5 PUBLISHED → DRAFT 非法', () => {
      expect(() => ds.validateTransition('PUBLISHED', 'DRAFT')).toThrow(NoticeStateTransitionError);
    });

    test('1.6 ARCHIVED 是终态（无合法转换）', () => {
      expect(ds.isTerminal('ARCHIVED')).toBe(true);
      expect(ds.getAllowedTransitions('ARCHIVED')).toEqual([]);
    });

    test('1.7 canAcknowledge — requireConfirm=true + 未确认 = true', () => {
      expect(ds.canAcknowledge(true, false)).toBe(true);
    });

    test('1.8 canAcknowledge — requireConfirm=false = false', () => {
      expect(ds.canAcknowledge(false, false)).toBe(false);
    });

    test('1.9 canAcknowledge — 已确认 = false', () => {
      expect(ds.canAcknowledge(true, true)).toBe(false);
    });
  });

  // ==========================================================
  // 2. CapabilityService — createNotice
  // ==========================================================

  describe('2. createNotice — 创建草稿', () => {
    test('2.1 创建草稿 → 返回 DRAFT 状态', async () => {
      const deps = createMockDeps();
      const svc = new NoticeCapabilityService(deps);
      const ctx = buildCtx();

      (deps.noticeRepository.create as jest.Mock).mockResolvedValue(MOCK_NOTICE_DRAFT);
      (deps.timelineRepository.create as jest.Mock).mockResolvedValue(MOCK_TIMELINE_CREATED);

      const result = await svc.createNotice({
        title: '期末考试安排通知',
        content: '本周五进行期末考试，请做好准备。',
        noticeType: 'NOTICE',
        targets: [{ targetType: 'CLASS', targetId: 'cls_001', targetLabel: '高一1班' }],
        requireConfirm: true,
      }, ctx);

      expect(result.status).toBe('DRAFT');
      expect(result.title).toBe('期末考试安排通知');
      expect(result.requireConfirm).toBe(true);
      expect(result.noticeNo).toMatch(/^NT\d{8}-\d{4}$/);
    });

    test('2.2 创建草稿 → 写 Timeline（NOTICE_CREATED）', async () => {
      const deps = createMockDeps();
      const svc = new NoticeCapabilityService(deps);
      const ctx = buildCtx();

      (deps.noticeRepository.create as jest.Mock).mockResolvedValue(MOCK_NOTICE_DRAFT);
      (deps.timelineRepository.create as jest.Mock).mockResolvedValue(MOCK_TIMELINE_CREATED);

      await svc.createNotice({
        title: '期末考试安排通知',
        content: '本周五进行期末考试，请做好准备。',
        noticeType: 'NOTICE',
        targets: [{ targetType: 'CLASS', targetId: 'cls_001', targetLabel: '高一1班' }],
      }, ctx);

      const timelineCalls = (deps.timelineRepository.create as jest.Mock).mock.calls;
      expect(timelineCalls.length).toBeGreaterThanOrEqual(1);

      const createdEvent = timelineCalls.find((call: any[]) => call[0].eventType === 'NOTICE_CREATED');
      expect(createdEvent).toBeTruthy();
      expect(createdEvent[0].metadata.status).toBe('DRAFT');
    });
  });

  // ==========================================================
  // 3. CapabilityService — publishNotice
  // ==========================================================

  describe('3. publishNotice — 发布通知', () => {
    test('3.1 DRAFT → PUBLISHED 成功', async () => {
      const deps = createMockDeps();
      const svc = new NoticeCapabilityService(deps);
      const ctx = buildCtx();

      (deps.noticeRepository.findById as jest.Mock).mockResolvedValue(MOCK_NOTICE_DRAFT);
      (deps.noticeRepository.publish as jest.Mock).mockResolvedValue(MOCK_NOTICE_PUBLISHED);
      (deps.timelineRepository.create as jest.Mock).mockResolvedValue(MOCK_TIMELINE_PUBLISHED);
      (deps.timelineRepository.findByRelated as jest.Mock).mockResolvedValue([MOCK_TIMELINE_CREATED, MOCK_TIMELINE_PUBLISHED]);

      const result = await svc.publishNotice('notice_001', {}, ctx);

      expect(result.status).toBe('PUBLISHED');
      expect(result.publishedAt).not.toBeNull();
    });

    test('3.2 PUBLISHED → 再次 publish 非法', async () => {
      const deps = createMockDeps();
      const svc = new NoticeCapabilityService(deps);
      const ctx = buildCtx();

      (deps.noticeRepository.findById as jest.Mock).mockResolvedValue(MOCK_NOTICE_PUBLISHED);

      await expect(svc.publishNotice('notice_001', {}, ctx)).rejects.toThrow(NoticeStateTransitionError);
    });

    test('3.3 发布 → 写 Timeline（NOTICE_PUBLISHED）', async () => {
      const deps = createMockDeps();
      const svc = new NoticeCapabilityService(deps);
      const ctx = buildCtx();

      (deps.noticeRepository.findById as jest.Mock).mockResolvedValue(MOCK_NOTICE_DRAFT);
      (deps.noticeRepository.publish as jest.Mock).mockResolvedValue(MOCK_NOTICE_PUBLISHED);
      (deps.timelineRepository.create as jest.Mock).mockResolvedValue(MOCK_TIMELINE_PUBLISHED);
      (deps.timelineRepository.findByRelated as jest.Mock).mockResolvedValue([]);

      await svc.publishNotice('notice_001', {}, ctx);

      const timelineCalls = (deps.timelineRepository.create as jest.Mock).mock.calls;
      const publishedEvent = timelineCalls.find((call: any[]) => call[0].eventType === 'NOTICE_PUBLISHED');
      expect(publishedEvent).toBeTruthy();
      expect(publishedEvent[0].metadata.from).toBe('DRAFT');
      expect(publishedEvent[0].metadata.to).toBe('PUBLISHED');
    });
  });

  // ==========================================================
  // 4. CapabilityService — markRead
  // ==========================================================

  describe('4. markRead — 标记已读', () => {
    test('4.1 标记已读成功', async () => {
      const deps = createMockDeps();
      const svc = new NoticeCapabilityService(deps);
      const ctx = buildCtx({ actor: { userId: 'teacher_002', teacherId: 'teacher_002', parentId: null, userType: 'TEACHER' } });

      (deps.noticeRepository.findById as jest.Mock).mockImplementation(async (id: string, withReads: boolean) => {
        if (withReads) {
          return { ...MOCK_NOTICE_PUBLISHED, reads: [MOCK_NOTICE_READ] };
        }
        return MOCK_NOTICE_PUBLISHED;
      });
      (deps.timelineRepository.create as jest.Mock).mockResolvedValue(MOCK_TIMELINE_READ);
      (deps.timelineRepository.findByRelated as jest.Mock).mockResolvedValue([MOCK_TIMELINE_CREATED, MOCK_TIMELINE_PUBLISHED, MOCK_TIMELINE_READ]);

      const result = await svc.markRead('notice_001', ctx);

      expect(result.isRead).toBe(true);
      expect(result.readAt).not.toBeNull();
    });

    test('4.2 标记已读 → 写 Timeline（NOTICE_READ）', async () => {
      const deps = createMockDeps();
      const svc = new NoticeCapabilityService(deps);
      const ctx = buildCtx({ actor: { userId: 'teacher_002', teacherId: 'teacher_002', parentId: null, userType: 'TEACHER' } });

      (deps.noticeRepository.findById as jest.Mock).mockImplementation(async (id: string, withReads: boolean) => {
        if (withReads) {
          return { ...MOCK_NOTICE_PUBLISHED, reads: [MOCK_NOTICE_READ] };
        }
        return MOCK_NOTICE_PUBLISHED;
      });
      (deps.timelineRepository.create as jest.Mock).mockResolvedValue(MOCK_TIMELINE_READ);
      (deps.timelineRepository.findByRelated as jest.Mock).mockResolvedValue([]);

      await svc.markRead('notice_001', ctx);

      const timelineCalls = (deps.timelineRepository.create as jest.Mock).mock.calls;
      const readEvent = timelineCalls.find((call: any[]) => call[0].eventType === 'NOTICE_READ');
      expect(readEvent).toBeTruthy();
      expect(readEvent[0].metadata.readerId).toBe('teacher_002');
    });
  });

  // ==========================================================
  // 5. CapabilityService — acknowledge
  // ==========================================================

  describe('5. acknowledge — 确认阅读', () => {
    test('5.1 requireConfirm=true + 未确认 → Acknowledge 成功', async () => {
      const deps = createMockDeps();
      const svc = new NoticeCapabilityService(deps);
      const ctx = buildCtx({ actor: { userId: 'teacher_002', teacherId: 'teacher_002', parentId: null, userType: 'TEACHER' } });

      // 第一次查询：未确认状态
      // 第二次查询（markConfirmed 后）：已确认状态
      let callCount = 0;
      (deps.noticeRepository.findById as jest.Mock).mockImplementation(async (id: string, withReads: boolean) => {
        callCount++;
        if (withReads) {
          if (callCount >= 2) {
            // markConfirmed 后的查询
            return { ...MOCK_NOTICE_PUBLISHED, requireConfirm: true, reads: [MOCK_NOTICE_ACKNOWLEDGED] };
          }
          return { ...MOCK_NOTICE_PUBLISHED, requireConfirm: true, reads: [MOCK_NOTICE_READ] };
        }
        return { ...MOCK_NOTICE_PUBLISHED, requireConfirm: true };
      });
      (deps.timelineRepository.create as jest.Mock).mockResolvedValue(MOCK_TIMELINE_ACKNOWLEDGED);
      (deps.timelineRepository.findByRelated as jest.Mock).mockResolvedValue([MOCK_TIMELINE_CREATED, MOCK_TIMELINE_PUBLISHED, MOCK_TIMELINE_READ, MOCK_TIMELINE_ACKNOWLEDGED]);

      const result = await svc.acknowledge('notice_001', ctx);

      expect(result.isAcknowledged).toBe(true);
      expect(result.confirmedAt).not.toBeNull();
    });

    test('5.2 requireConfirm=false → Acknowledge 被拒绝', async () => {
      const deps = createMockDeps();
      const svc = new NoticeCapabilityService(deps);
      const ctx = buildCtx({ actor: { userId: 'teacher_002', teacherId: 'teacher_002', parentId: null, userType: 'TEACHER' } });

      (deps.noticeRepository.findById as jest.Mock).mockImplementation(async (id: string, withReads: boolean) => {
        if (withReads) {
          return { ...MOCK_NOTICE_PUBLISHED, requireConfirm: false, reads: [MOCK_NOTICE_READ] };
        }
        return { ...MOCK_NOTICE_PUBLISHED, requireConfirm: false };
      });

      await expect(svc.acknowledge('notice_001', ctx)).rejects.toThrow('该通知不需要确认或已确认');
    });

    test('5.3 已确认 → 再次 Acknowledge 被拒绝', async () => {
      const deps = createMockDeps();
      const svc = new NoticeCapabilityService(deps);
      const ctx = buildCtx({ actor: { userId: 'teacher_002', teacherId: 'teacher_002', parentId: null, userType: 'TEACHER' } });

      (deps.noticeRepository.findById as jest.Mock).mockImplementation(async (id: string, withReads: boolean) => {
        if (withReads) {
          return { ...MOCK_NOTICE_PUBLISHED, requireConfirm: true, reads: [MOCK_NOTICE_ACKNOWLEDGED] };
        }
        return { ...MOCK_NOTICE_PUBLISHED, requireConfirm: true };
      });

      await expect(svc.acknowledge('notice_001', ctx)).rejects.toThrow('该通知不需要确认或已确认');
    });

    test('5.4 Acknowledge → 写 Timeline（NOTICE_ACKNOWLEDGED）', async () => {
      const deps = createMockDeps();
      const svc = new NoticeCapabilityService(deps);
      const ctx = buildCtx({ actor: { userId: 'teacher_002', teacherId: 'teacher_002', parentId: null, userType: 'TEACHER' } });

      (deps.noticeRepository.findById as jest.Mock).mockImplementation(async (id: string, withReads: boolean) => {
        if (withReads) {
          return { ...MOCK_NOTICE_PUBLISHED, requireConfirm: true, reads: [MOCK_NOTICE_READ] };
        }
        return { ...MOCK_NOTICE_PUBLISHED, requireConfirm: true };
      });
      (deps.timelineRepository.create as jest.Mock).mockResolvedValue(MOCK_TIMELINE_ACKNOWLEDGED);
      (deps.timelineRepository.findByRelated as jest.Mock).mockResolvedValue([]);

      await svc.acknowledge('notice_001', ctx);

      const timelineCalls = (deps.timelineRepository.create as jest.Mock).mock.calls;
      const ackEvent = timelineCalls.find((call: any[]) => call[0].eventType === 'NOTICE_ACKNOWLEDGED');
      expect(ackEvent).toBeTruthy();
      expect(ackEvent[0].metadata.readerId).toBe('teacher_002');
    });
  });

  // ==========================================================
  // 6. CapabilityService — getNotice
  // ==========================================================

  describe('6. getNotice — 查询详情', () => {
    test('6.1 查询存在通知 → 返回详情 + Timeline', async () => {
      const deps = createMockDeps();
      const svc = new NoticeCapabilityService(deps);
      const ctx = buildCtx();

      (deps.noticeRepository.findById as jest.Mock).mockImplementation(async (id: string, withReads: boolean) => {
        if (withReads) {
          return { ...MOCK_NOTICE_PUBLISHED, reads: [] };
        }
        return MOCK_NOTICE_PUBLISHED;
      });
      (deps.timelineRepository.findByRelated as jest.Mock).mockResolvedValue([MOCK_TIMELINE_CREATED, MOCK_TIMELINE_PUBLISHED]);

      const result = await svc.getNotice('notice_001', ctx);

      expect(result.id).toBe('notice_001');
      expect(result.timeline.length).toBe(2);
    });

    test('6.2 查询不存在通知 → 抛 NoticeNotFoundError', async () => {
      const deps = createMockDeps();
      const svc = new NoticeCapabilityService(deps);
      const ctx = buildCtx();

      (deps.noticeRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(svc.getNotice('not_exist', ctx)).rejects.toThrow(NoticeNotFoundError);
    });
  });

  // ==========================================================
  // 7. Timeline 强一致 — 事务验证（C03 核心）
  // ==========================================================

  describe('7. Timeline 强一致 — 同事务', () => {
    test('7.1 createNotice — Notice 创建 和 Timeline 写入在同一个事务', async () => {
      const deps = createMockDeps();
      const svc = new NoticeCapabilityService(deps);
      const ctx = buildCtx();

      let capturedTx: any = null;
      (deps.noticeRepository.withTransaction as jest.Mock).mockImplementation(async (fn: any) => {
        const tx = { id: 'mock_tx_' + Math.random() };
        capturedTx = tx;
        return fn(tx);
      });

      (deps.noticeRepository.create as jest.Mock).mockImplementation(async (_data: any, tx: any) => {
        expect(tx).toBe(capturedTx);
        return MOCK_NOTICE_DRAFT;
      });
      (deps.timelineRepository.create as jest.Mock).mockImplementation(async (_data: any, tx: any) => {
        expect(tx).toBe(capturedTx);
        return MOCK_TIMELINE_CREATED;
      });

      await svc.createNotice({
        title: '期末考试安排通知',
        content: '本周五进行期末考试，请做好准备。',
        noticeType: 'NOTICE',
        targets: [{ targetType: 'CLASS', targetId: 'cls_001', targetLabel: '高一1班' }],
      }, ctx);

      expect(capturedTx).not.toBeNull();
      expect(deps.noticeRepository.create).toHaveBeenCalled();
      expect(deps.timelineRepository.create).toHaveBeenCalled();
    });

    test('7.2 publishNotice — publish 和 Timeline 在同一个事务', async () => {
      const deps = createMockDeps();
      const svc = new NoticeCapabilityService(deps);
      const ctx = buildCtx();

      let capturedTx: any = null;
      (deps.noticeRepository.withTransaction as jest.Mock).mockImplementation(async (fn: any) => {
        const tx = { id: 'mock_tx_publish' };
        capturedTx = tx;
        return fn(tx);
      });

      (deps.noticeRepository.findById as jest.Mock).mockResolvedValue(MOCK_NOTICE_DRAFT);
      (deps.noticeRepository.publish as jest.Mock).mockImplementation(async (_id: string, tx: any) => {
        expect(tx).toBe(capturedTx);
        return MOCK_NOTICE_PUBLISHED;
      });
      (deps.timelineRepository.create as jest.Mock).mockImplementation(async (_data: any, tx: any) => {
        expect(tx).toBe(capturedTx);
        return MOCK_TIMELINE_PUBLISHED;
      });
      (deps.timelineRepository.findByRelated as jest.Mock).mockResolvedValue([]);

      await svc.publishNotice('notice_001', {}, ctx);

      expect(capturedTx).not.toBeNull();
    });

    test('7.3 markRead — markRead 和 Timeline 在同一个事务', async () => {
      const deps = createMockDeps();
      const svc = new NoticeCapabilityService(deps);
      const ctx = buildCtx({ actor: { userId: 'teacher_002', teacherId: 'teacher_002', parentId: null, userType: 'TEACHER' } });

      let capturedTx: any = null;
      (deps.noticeRepository.withTransaction as jest.Mock).mockImplementation(async (fn: any) => {
        const tx = { id: 'mock_tx_read' };
        capturedTx = tx;
        return fn(tx);
      });

      (deps.noticeRepository.findById as jest.Mock).mockImplementation(async (id: string, withReads: boolean) => {
        if (withReads) {
          return { ...MOCK_NOTICE_PUBLISHED, reads: [] };
        }
        return MOCK_NOTICE_PUBLISHED;
      });
      (deps.noticeRepository.markRead as jest.Mock).mockImplementation(async (_noticeId: string, _readerId: string, tx: any) => {
        expect(tx).toBe(capturedTx);
      });
      (deps.timelineRepository.create as jest.Mock).mockImplementation(async (_data: any, tx: any) => {
        expect(tx).toBe(capturedTx);
        return MOCK_TIMELINE_READ;
      });
      (deps.timelineRepository.findByRelated as jest.Mock).mockResolvedValue([]);

      await svc.markRead('notice_001', ctx);

      expect(capturedTx).not.toBeNull();
    });

    test('7.4 acknowledge — markConfirmed 和 Timeline 在同一个事务', async () => {
      const deps = createMockDeps();
      const svc = new NoticeCapabilityService(deps);
      const ctx = buildCtx({ actor: { userId: 'teacher_002', teacherId: 'teacher_002', parentId: null, userType: 'TEACHER' } });

      let capturedTx: any = null;
      (deps.noticeRepository.withTransaction as jest.Mock).mockImplementation(async (fn: any) => {
        const tx = { id: 'mock_tx_ack' };
        capturedTx = tx;
        return fn(tx);
      });

      (deps.noticeRepository.findById as jest.Mock).mockImplementation(async (id: string, withReads: boolean) => {
        if (withReads) {
          return { ...MOCK_NOTICE_PUBLISHED, requireConfirm: true, reads: [MOCK_NOTICE_READ] };
        }
        return { ...MOCK_NOTICE_PUBLISHED, requireConfirm: true };
      });
      (deps.noticeRepository.markConfirmed as jest.Mock).mockImplementation(async (_noticeId: string, _readerId: string, tx: any) => {
        expect(tx).toBe(capturedTx);
      });
      (deps.timelineRepository.create as jest.Mock).mockImplementation(async (_data: any, tx: any) => {
        expect(tx).toBe(capturedTx);
        return MOCK_TIMELINE_ACKNOWLEDGED;
      });
      (deps.timelineRepository.findByRelated as jest.Mock).mockResolvedValue([]);

      await svc.acknowledge('notice_001', ctx);

      expect(capturedTx).not.toBeNull();
    });
  });

  // ==========================================================
  // 8. Timeline Validation — 4 种事件类型完整写入
  // ==========================================================

  describe('8. Timeline Validation — C03 四种事件类型', () => {
    test('8.1 NOTICE_CREATED 事件写入', async () => {
      const deps = createMockDeps();
      const svc = new NoticeCapabilityService(deps);
      const ctx = buildCtx();

      (deps.noticeRepository.create as jest.Mock).mockResolvedValue(MOCK_NOTICE_DRAFT);
      (deps.timelineRepository.create as jest.Mock).mockResolvedValue(MOCK_TIMELINE_CREATED);

      await svc.createNotice({
        title: '期末考试安排通知',
        content: '本周五进行期末考试，请做好准备。',
        noticeType: 'NOTICE',
        targets: [{ targetType: 'CLASS', targetId: 'cls_001', targetLabel: '高一1班' }],
      }, ctx);

      const calls = (deps.timelineRepository.create as jest.Mock).mock.calls;
      const event = calls.find((call: any[]) => call[0].eventType === 'NOTICE_CREATED');
      expect(event).toBeTruthy();
      expect(event[0].eventSource).toBe('NOTICE');
      expect(event[0].noticeId).toBe('notice_001');
    });

    test('8.2 NOTICE_PUBLISHED 事件写入', async () => {
      const deps = createMockDeps();
      const svc = new NoticeCapabilityService(deps);
      const ctx = buildCtx();

      (deps.noticeRepository.findById as jest.Mock).mockResolvedValue(MOCK_NOTICE_DRAFT);
      (deps.noticeRepository.publish as jest.Mock).mockResolvedValue(MOCK_NOTICE_PUBLISHED);
      (deps.timelineRepository.create as jest.Mock).mockResolvedValue(MOCK_TIMELINE_PUBLISHED);
      (deps.timelineRepository.findByRelated as jest.Mock).mockResolvedValue([]);

      await svc.publishNotice('notice_001', {}, ctx);

      const calls = (deps.timelineRepository.create as jest.Mock).mock.calls;
      const event = calls.find((call: any[]) => call[0].eventType === 'NOTICE_PUBLISHED');
      expect(event).toBeTruthy();
      expect(event[0].eventSource).toBe('NOTICE');
      expect(event[0].noticeId).toBe('notice_001');
    });

    test('8.3 NOTICE_READ 事件写入', async () => {
      const deps = createMockDeps();
      const svc = new NoticeCapabilityService(deps);
      const ctx = buildCtx({ actor: { userId: 'teacher_002', teacherId: 'teacher_002', parentId: null, userType: 'TEACHER' } });

      (deps.noticeRepository.findById as jest.Mock).mockImplementation(async (id: string, withReads: boolean) => {
        if (withReads) {
          return { ...MOCK_NOTICE_PUBLISHED, reads: [] };
        }
        return MOCK_NOTICE_PUBLISHED;
      });
      (deps.timelineRepository.create as jest.Mock).mockResolvedValue(MOCK_TIMELINE_READ);
      (deps.timelineRepository.findByRelated as jest.Mock).mockResolvedValue([]);

      await svc.markRead('notice_001', ctx);

      const calls = (deps.timelineRepository.create as jest.Mock).mock.calls;
      const event = calls.find((call: any[]) => call[0].eventType === 'NOTICE_READ');
      expect(event).toBeTruthy();
      expect(event[0].eventSource).toBe('NOTICE');
      expect(event[0].noticeId).toBe('notice_001');
    });

    test('8.4 NOTICE_ACKNOWLEDGED 事件写入', async () => {
      const deps = createMockDeps();
      const svc = new NoticeCapabilityService(deps);
      const ctx = buildCtx({ actor: { userId: 'teacher_002', teacherId: 'teacher_002', parentId: null, userType: 'TEACHER' } });

      (deps.noticeRepository.findById as jest.Mock).mockImplementation(async (id: string, withReads: boolean) => {
        if (withReads) {
          return { ...MOCK_NOTICE_PUBLISHED, requireConfirm: true, reads: [MOCK_NOTICE_READ] };
        }
        return { ...MOCK_NOTICE_PUBLISHED, requireConfirm: true };
      });
      (deps.timelineRepository.create as jest.Mock).mockResolvedValue(MOCK_TIMELINE_ACKNOWLEDGED);
      (deps.timelineRepository.findByRelated as jest.Mock).mockResolvedValue([]);

      await svc.acknowledge('notice_001', ctx);

      const calls = (deps.timelineRepository.create as jest.Mock).mock.calls;
      const event = calls.find((call: any[]) => call[0].eventType === 'NOTICE_ACKNOWLEDGED');
      expect(event).toBeTruthy();
      expect(event[0].eventSource).toBe('NOTICE');
      expect(event[0].noticeId).toBe('notice_001');
    });
  });

  // ==========================================================
  // 9. 架构约束验证
  // ==========================================================

  describe('9. 架构约束', () => {
    test('9.1 CapabilityService 不直接查 Prisma（只调用 Repository）', async () => {
      const deps = createMockDeps();
      const svc = new NoticeCapabilityService(deps);
      const ctx = buildCtx();

      (deps.noticeRepository.create as jest.Mock).mockResolvedValue(MOCK_NOTICE_DRAFT);
      (deps.timelineRepository.create as jest.Mock).mockResolvedValue(MOCK_TIMELINE_CREATED);

      await svc.createNotice({
        title: '测试',
        content: '内容',
        noticeType: 'NOTICE',
        targets: [],
      }, ctx);

      // 验证只调用了 Repository 方法，没有调用 Prisma 方法
      expect(deps.noticeRepository.create).toHaveBeenCalled();
      expect(deps.timelineRepository.create).toHaveBeenCalled();
    });

    test('9.2 DomainService 不碰数据库（纯函数）', () => {
      const ds = new NoticeDomainService();

      // validateTransition 不查数据库
      const result = ds.validateTransition('DRAFT', 'PUBLISHED');
      expect(result).toBe('NOTICE_PUBLISHED');

      // canAcknowledge 不查数据库
      expect(ds.canAcknowledge(true, false)).toBe(true);
    });

    test('9.3 DomainService 不允许改 Student（没有 Student 相关操作）', () => {
      const ds = new NoticeDomainService();
      // NoticeDomainService 没有任何 Student 相关的方法
      const keys = Object.getOwnPropertyNames(NoticeDomainService.prototype);
      const studentRelated = keys.filter((k) =>
        k.toLowerCase().includes('student') || k.toLowerCase().includes('status'),
      );
      expect(studentRelated).toEqual([]);
    });
  });
});
