/**
 * 测试 3：请假自动产生 TimelineEvent
 *
 * 验收要求：
 * 1. 调用 LeaveService.createLeave() 后，LeaveRecord 被创建
 * 2. 同时自动产生 TimelineEvent（eventType = LEAVE_CREATED, eventSource = LEAVE, relatedType = LEAVE, relatedId = leaveId）
 * 3. TimelineEvent 与 LeaveRecord 通过 (relatedType + relatedId) 关联
 * 4. 唯一性约束 (studentId, eventSource, sourceEventId) 防止重复
 *
 * 关键验证：
 * - prisma.leaveRecord.create 被调用
 * - prisma.timelineEvent.create 被调用，参数含 LEAVE 相关字段
 * - 整个流程在 $transaction 中
 */

import { setupPrismaMock, createMockPrisma, setMockPrisma, fakeLeave, fakeStudent, fakeTimelineEvent, getMockPrisma } from './helpers/mock-prisma';

setupPrismaMock();

describe('测试 3: 请假自动产生 TimelineEvent', () => {
  beforeEach(() => {
    setMockPrisma(createMockPrisma());
  });

  it('LeaveService.createLeave 应该在事务中创建 LeaveRecord + TimelineEvent', async () => {
    const { leaveService } = await import('../services/leave.service');
    const mockPrisma = getMockPrisma();

    const createdLeave = fakeLeave({ id: 'leave_new_001', leaveNo: 'LV20260901001' });
    const createdTimeline = fakeTimelineEvent({ id: 'tl_new_001', eventType: 'LEAVE_CREATED', sourceEventId: 'leave_new_001' });

    // 事务外的 LeaveRepository.create
    mockPrisma.leaveRecord.create.mockResolvedValue(createdLeave);
    // 事务外的 leaveRepository.findById (用于 submitLeave → transition)
    mockPrisma.leaveRecord.findUnique.mockResolvedValue(fakeLeave({ id: 'leave_new_001', status: 'DRAFT' }));
    // 事务外的 leaveRepository.updateStatus (用于 submitLeave → transition → update)
    mockPrisma.leaveRecord.update.mockResolvedValue({ ...createdLeave, status: 'PENDING' });

    const mockTx = {
      student: { findUnique: jest.fn(), update: jest.fn() },
      leaveRecord: { create: jest.fn(), update: jest.fn() },
      timelineEvent: { create: jest.fn() },
    };
    mockTx.student.findUnique.mockResolvedValue(fakeStudent({ id: 'stu_001', name: '张三' }));
    mockTx.leaveRecord.update.mockResolvedValue({ ...createdLeave, status: 'PENDING' });
    mockTx.timelineEvent.create.mockResolvedValue(createdTimeline);
    mockTx.student.update.mockResolvedValue(fakeStudent({ id: 'stu_001' }));
    mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockTx));

    // 事务外调用：studentRepository.findById() 走 prisma.student.findUnique
    mockPrisma.student.findUnique.mockResolvedValue(
      fakeStudent({ id: 'stu_001', name: '张三' })
    );

    await leaveService.createLeave({
      studentId: 'stu_001',
      leaveType: 'SICK',
      leaveReasonType: 'ILLNESS',
      reason: '感冒发烧',
      startAt: new Date('2026-09-01T09:00:00'),
      endAt: new Date('2026-09-01T14:00:00'),
      applicantId: 'teacher_001',
      applicantName: '李老师',
    });

    expect(mockPrisma.leaveRecord.create).toHaveBeenCalled();
    expect(mockTx.timelineEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'LEAVE_CREATED',
          eventSource: 'LEAVE',
          sourceEventId: 'leave_new_001',
          studentId: 'stu_001',
          relatedType: 'LEAVE',
          relatedId: 'leave_new_001',
        }),
      })
    );
  });

  it('LeaveService.createLeave 必须在 $transaction 中（v1.3 强制：事件 + 状态原子性）', async () => {
    const { leaveService } = await import('../services/leave.service');
    const mockPrisma = getMockPrisma();

    const createdLeave = fakeLeave({ id: 'leave_tx_001' });
    mockPrisma.leaveRecord.create.mockResolvedValue(createdLeave);
    mockPrisma.leaveRecord.findUnique.mockResolvedValue(fakeLeave({ id: 'leave_tx_001', status: 'DRAFT' }));
    mockPrisma.leaveRecord.update.mockResolvedValue({ ...createdLeave, status: 'PENDING' });

    const mockTx = {
      student: { findUnique: jest.fn(), update: jest.fn() },
      leaveRecord: { create: jest.fn(), update: jest.fn() },
      timelineEvent: { create: jest.fn() },
    };
    mockTx.leaveRecord.update.mockResolvedValue({ ...createdLeave, status: 'PENDING' });
    mockTx.timelineEvent.create.mockResolvedValue(fakeTimelineEvent({ id: 'tl_tx_001' }));
    mockTx.student.findUnique.mockResolvedValue(fakeStudent({ id: 'stu_001' }));
    mockTx.student.update.mockResolvedValue(fakeStudent({ id: 'stu_001' }));
    mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockTx));

    // 事务外：studentRepository.findById
    mockPrisma.student.findUnique.mockResolvedValue(fakeStudent({ id: 'stu_001' }));

    await leaveService.createLeave({
      studentId: 'stu_001',
      leaveType: 'SICK',
      leaveReasonType: 'ILLNESS',
      reason: '测试',
      startAt: new Date(),
      endAt: new Date(),
      applicantId: 'teacher_001',
      applicantName: '李老师',
    });

    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it('TimelineService.createEvent 写入 metadata 必须含 leaveNo 便于反查', async () => {
    const { timelineService } = await import('../services/timeline.service');
    const mockPrisma = getMockPrisma();

    const mockTx = {
      student: { findUnique: jest.fn(), update: jest.fn() },
      timelineEvent: { create: jest.fn() },
    };
    mockTx.student.findUnique.mockResolvedValue(fakeStudent({ id: 'stu_001' }));
    mockTx.timelineEvent.create.mockResolvedValue(fakeTimelineEvent({}));
    mockTx.student.update.mockResolvedValue(fakeStudent({ id: 'stu_001' }));
    mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockTx));

    await timelineService.createEvent({
      eventType: 'LEAVE_CREATED',
      eventSource: 'LEAVE',
      sourceEventId: 'leave_meta_001',
      studentId: 'stu_001',
      operatorId: 'teacher_001',
      operatorName: '李老师',
      metadata: { leaveNo: 'LV20260901099', custom: 'value' },
      relatedType: 'LEAVE',
      relatedId: 'leave_meta_001',
    });

    expect(mockTx.timelineEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            leaveNo: 'LV20260901099',
            custom: 'value',
          }),
        }),
      })
    );
  });

  it('Timeline 写入必须包含 (studentId, eventSource, sourceEventId) 唯一性约束字段', async () => {
    const { timelineService } = await import('../services/timeline.service');
    const mockPrisma = getMockPrisma();

    const mockTx = {
      student: { findUnique: jest.fn(), update: jest.fn() },
      timelineEvent: { create: jest.fn() },
    };
    mockTx.student.findUnique.mockResolvedValue(fakeStudent({ id: 'stu_unique_001' }));
    mockTx.timelineEvent.create.mockResolvedValue(fakeTimelineEvent({}));
    mockTx.student.update.mockResolvedValue(fakeStudent({ id: 'stu_unique_001' }));
    mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockTx));

    await timelineService.createEvent({
      eventType: 'LEAVE_SUBMITTED',
      eventSource: 'LEAVE',
      sourceEventId: 'leave_unique_001',
      studentId: 'stu_unique_001',
      relatedType: 'LEAVE',
      relatedId: 'leave_unique_001',
    });

    const callArg = mockTx.timelineEvent.create.mock.calls[0][0].data;
    expect(callArg.studentId).toBe('stu_unique_001');
    expect(callArg.eventSource).toBe('LEAVE');
    expect(callArg.sourceEventId).toBe('leave_unique_001');
  });
});
