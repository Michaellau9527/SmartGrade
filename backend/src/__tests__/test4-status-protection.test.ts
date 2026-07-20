/**
 * 测试 4: 状态变化必须通过 TimelineEvent → Resolver
 *
 * 验收要求（v1.3 §8.1.1 强制）：
 * 1. ❌ StudentRepository.setCurrentStatus() 必须抛 DirectStatusUpdateError
 * 2. ❌ StudentRepository.setCurrentLocation() 必须抛 DirectStatusUpdateError
 * 3. ❌ StudentRepository.updateStatus() 必须抛 DirectStatusUpdateError
 * 4. ❌ StudentRepository.updateLocation() 必须抛 DirectStatusUpdateError
 * 5. ❌ TimelineRepository.update() 必须抛 [R-014] 错误
 * 6. ❌ TimelineRepository.delete() 必须抛 [R-014] 错误
 * 7. ❌ LeaveRepository.autoMarkOverdue/NoShow/Expired 必须抛 v4.2 错误
 * 8. ✅ 合法路径：TimelineService.createEvent() → Resolver 推导 → Student.update()
 */

import { setupPrismaMock, createMockPrisma, setMockPrisma, fakeStudent, getMockPrisma } from './helpers/mock-prisma';
import { DirectStatusUpdateError } from '../repositories/base.repository';

setupPrismaMock();

describe('测试 4: 状态保护 - 禁止直接修改 Student.current_status/current_location', () => {
  beforeEach(() => {
    setMockPrisma(createMockPrisma());
  });

  // ============================================================
  // 1. ❌ 禁止方法必须抛 DirectStatusUpdateError
  // ============================================================

  describe('❌ StudentRepository 禁止方法', () => {
    it('setCurrentStatus 必须抛 DirectStatusUpdateError', async () => {
      const { studentRepository } = await import('../repositories/student.repository');
      await expect(
        (studentRepository as any).setCurrentStatus('stu_001', 'OUT_OF_SCHOOL')
      ).rejects.toThrow(DirectStatusUpdateError);
    });

    it('setCurrentLocation 必须抛 DirectStatusUpdateError', async () => {
      const { studentRepository } = await import('../repositories/student.repository');
      await expect(
        (studentRepository as any).setCurrentLocation('stu_001', 'OFF_CAMPUS')
      ).rejects.toThrow(DirectStatusUpdateError);
    });

    it('updateStatus 必须抛 DirectStatusUpdateError', async () => {
      const { studentRepository } = await import('../repositories/student.repository');
      await expect(
        (studentRepository as any).updateStatus('stu_001', 'GRADUATED')
      ).rejects.toThrow(DirectStatusUpdateError);
    });

    it('updateLocation 必须抛 DirectStatusUpdateError', async () => {
      const { studentRepository } = await import('../repositories/student.repository');
      await expect(
        (studentRepository as any).updateLocation('stu_001', 'DORM')
      ).rejects.toThrow(DirectStatusUpdateError);
    });

    it('错误信息应引导开发者走 TimelineService', async () => {
      const { studentRepository } = await import('../repositories/student.repository');
      try {
        await (studentRepository as any).setCurrentStatus('stu_001', 'OUT_OF_SCHOOL');
        fail('应该抛出错误');
      } catch (err: any) {
        expect(err).toBeInstanceOf(DirectStatusUpdateError);
        expect(err.message).toContain('v1.3');
        expect(err.message).toContain('TimelineService');
      }
    });
  });

  // ============================================================
  // 2. ❌ TimelineRepository 不允许 update/delete
  // ============================================================

  describe('❌ TimelineRepository 禁止 update/delete（R-014 永久留痕）', () => {
    it('update 必须抛 [R-014] 错误', async () => {
      const { timelineRepository } = await import('../repositories/timeline.repository');
      await expect(
        timelineRepository.update('tl_001', { eventType: 'LEAVE_CREATED' } as any)
      ).rejects.toThrow(/R-014/);
    });

    it('delete 必须抛 [R-014] 错误', async () => {
      const { timelineRepository } = await import('../repositories/timeline.repository');
      await expect(
        timelineRepository.delete('tl_001')
      ).rejects.toThrow(/R-014/);
    });

    it('deleteMany 必须抛 [R-014] 错误', async () => {
      const { timelineRepository } = await import('../repositories/timeline.repository');
      await expect(
        timelineRepository.deleteMany({})
      ).rejects.toThrow(/R-014/);
    });
  });

  // ============================================================
  // 3. ❌ LeaveRepository 不允许自动判定返校
  // ============================================================

  describe('❌ LeaveRepository 禁止自动状态判定（v4.2 业务规则）', () => {
    it('autoCloseOverdueReturns 必须抛 v1.2 错误', async () => {
      const { leaveRepository } = await import('../repositories/leave.repository');
      await expect(
        (leaveRepository as any).autoCloseOverdueReturns(new Date())
      ).rejects.toThrow(/v1.2/);
    });

    it('autoMarkNoShow 必须抛 v4.2 错误', async () => {
      const { leaveRepository } = await import('../repositories/leave.repository');
      await expect(
        (leaveRepository as any).autoMarkNoShow('leave_001')
      ).rejects.toThrow(/v4.2/);
    });

    it('autoMarkExpired 必须抛 v4.2 错误', async () => {
      const { leaveRepository } = await import('../repositories/leave.repository');
      await expect(
        (leaveRepository as any).autoMarkExpired('leave_001')
      ).rejects.toThrow(/v4.2/);
    });

    it('autoMarkOverdue 必须抛 v4.2 错误', async () => {
      const { leaveRepository } = await import('../repositories/leave.repository');
      await expect(
        (leaveRepository as any).autoMarkOverdue('leave_001')
      ).rejects.toThrow(/v4.2/);
    });
  });

  // ============================================================
  // 4. ✅ 合法路径：Timeline → Resolver → Student
  // ============================================================

  describe('✅ 合法路径：TimelineEvent 驱动状态变更', () => {
    it('LEAVE_GATE_LEFT 事件应推导为 OUT_OF_SCHOOL + OFF_CAMPUS', async () => {
      const { timelineService } = await import('../services/timeline.service');
      const mockPrisma = getMockPrisma();

      const mockTx = {
        student: { findUnique: jest.fn(), update: jest.fn() },
        timelineEvent: { create: jest.fn() },
      };
      mockTx.student.findUnique.mockResolvedValue(
        fakeStudent({ id: 'stu_gate_001', currentStatus: 'ON_CAMPUS', currentLocation: 'CLASSROOM' })
      );
      mockTx.timelineEvent.create.mockResolvedValue({ id: 'tl_gate_001' });
      mockTx.student.update.mockResolvedValue(
        fakeStudent({ currentStatus: 'OUT_OF_SCHOOL', currentLocation: 'OFF_CAMPUS' })
      );
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockTx));

      const result = await timelineService.createEvent({
        eventType: 'LEAVE_GATE_LEFT',
        eventSource: 'LEAVE',
        sourceEventId: 'leave_gate_001',
        studentId: 'stu_gate_001',
        operatorId: 'guard_001',
        operatorName: '门卫',
        operatorRole: 'GATE_GUARD',
        relatedType: 'LEAVE',
        relatedId: 'leave_gate_001',
      });

      expect(result.resolved.newStatus).toBe('OUT_OF_SCHOOL');
      expect(result.resolved.newLocation).toBe('OFF_CAMPUS');
      expect(result.resolved.touched).toBe('BOTH');
    });

    it('LEAVE_RETURNED 事件应推导为 ON_CAMPUS + CLASSROOM', async () => {
      const { timelineService } = await import('../services/timeline.service');
      const mockPrisma = getMockPrisma();

      const mockTx = {
        student: { findUnique: jest.fn(), update: jest.fn() },
        timelineEvent: { create: jest.fn() },
      };
      mockTx.student.findUnique.mockResolvedValue(
        fakeStudent({ id: 'stu_ret_001', currentStatus: 'OUT_OF_SCHOOL', currentLocation: 'OFF_CAMPUS' })
      );
      mockTx.timelineEvent.create.mockResolvedValue({ id: 'tl_ret_001' });
      mockTx.student.update.mockResolvedValue(
        fakeStudent({ currentStatus: 'ON_CAMPUS', currentLocation: 'CLASSROOM' })
      );
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockTx));

      const result = await timelineService.createEvent({
        eventType: 'LEAVE_RETURNED',
        eventSource: 'LEAVE',
        sourceEventId: 'leave_ret_001',
        studentId: 'stu_ret_001',
        relatedType: 'LEAVE',
        relatedId: 'leave_ret_001',
      });

      expect(result.resolved.newStatus).toBe('ON_CAMPUS');
      expect(result.resolved.newLocation).toBe('CLASSROOM');
    });

    it('DORM_CHECKED_IN 事件应只触发位置变更（DORM），不动 status', async () => {
      const { timelineService } = await import('../services/timeline.service');
      const mockPrisma = getMockPrisma();

      const mockTx = {
        student: { findUnique: jest.fn(), update: jest.fn() },
        timelineEvent: { create: jest.fn() },
      };
      mockTx.student.findUnique.mockResolvedValue(
        fakeStudent({ id: 'stu_dorm_001', currentStatus: 'ON_CAMPUS', currentLocation: 'PLAYGROUND' })
      );
      mockTx.timelineEvent.create.mockResolvedValue({ id: 'tl_dorm_001' });
      mockTx.student.update.mockResolvedValue(
        fakeStudent({ currentStatus: 'ON_CAMPUS', currentLocation: 'DORM' })
      );
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockTx));

      const result = await timelineService.createEvent({
        eventType: 'DORM_CHECKED_IN',
        eventSource: 'DORM',
        sourceEventId: 'dorm_check_001',
        studentId: 'stu_dorm_001',
        relatedType: 'DORM',
        relatedId: 'dorm_check_001',
      });

      expect(result.resolved.newStatus).toBeNull();
      expect(result.resolved.newLocation).toBe('DORM');
      expect(result.resolved.touched).toBe('LOCATION');
    });

    it('NOTICE_SENT 事件不应触发任何状态变更（NONE）', async () => {
      const { timelineService } = await import('../services/timeline.service');
      const mockPrisma = getMockPrisma();

      const mockTx = {
        student: { findUnique: jest.fn(), update: jest.fn() },
        timelineEvent: { create: jest.fn() },
      };
      mockTx.student.findUnique.mockResolvedValue(fakeStudent({ id: 'stu_notice_001' }));
      mockTx.timelineEvent.create.mockResolvedValue({ id: 'tl_notice_001' });
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockTx));

      const result = await timelineService.createEvent({
        eventType: 'NOTICE_SENT',
        eventSource: 'NOTICE',
        sourceEventId: 'notice_001',
        studentId: 'stu_notice_001',
        relatedType: 'NOTICE',
        relatedId: 'notice_001',
      });

      expect(result.resolved.touched).toBe('NONE');
      expect(mockTx.student.update).not.toHaveBeenCalled();
    });

    it('事务中更新 Student 时必须同时设置 status_updated_at / location_updated_at', async () => {
      const { timelineService } = await import('../services/timeline.service');
      const mockPrisma = getMockPrisma();

      const mockTx = {
        student: { findUnique: jest.fn(), update: jest.fn() },
        timelineEvent: { create: jest.fn() },
      };
      mockTx.student.findUnique.mockResolvedValue(fakeStudent({ id: 'stu_ts_001' }));
      mockTx.timelineEvent.create.mockResolvedValue({ id: 'tl_ts_001' });
      mockTx.student.update.mockResolvedValue(fakeStudent({}));
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockTx));

      const occurredAt = new Date('2026-09-01T14:00:00');
      await timelineService.createEvent({
        eventType: 'LEAVE_GATE_LEFT',
        eventSource: 'LEAVE',
        sourceEventId: 'leave_ts_001',
        studentId: 'stu_ts_001',
        occurredAt,
        relatedType: 'LEAVE',
        relatedId: 'leave_ts_001',
      });

      const updateCall = mockTx.student.update.mock.calls[0][0];
      expect(updateCall.data.statusUpdatedAt).toEqual(occurredAt);
      expect(updateCall.data.locationUpdatedAt).toEqual(occurredAt);
      expect(updateCall.data.currentStatus).toBe('OUT_OF_SCHOOL');
      expect(updateCall.data.currentLocation).toBe('OFF_CAMPUS');
    });
  });
});
