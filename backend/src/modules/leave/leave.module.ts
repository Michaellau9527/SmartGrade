/**
 * LeaveModule — 学生请假模块（C02）
 *
 * 上游规则：Sprint 2.2 C02 — 刘老师拍板
 *
 * 六层流水线：
 *   LeaveController
 *       ↓
 *   LeaveCapabilityService（编排）
 *       ↓
 *   LeaveDomainService（规则）+ LeaveRepository + TimelineRepository + StudentRepository
 *       ↓
 *   TimelineEvent（强一致）
 *       ↓
 *   Prisma
 */

import { Module } from '@nestjs/common';
import { LeaveController } from './leave.controller';
import { LeaveCapabilityService } from './leave.capability-service';
import { LeaveDomainService } from './leave.domain-service';
import { leaveRepository } from '../../repositories/leave.repository';
import { timelineRepository } from '../../repositories/timeline.repository';
import { studentRepository } from '../../repositories/student.repository';

@Module({
  controllers: [LeaveController],
  providers: [
    {
      provide: LeaveCapabilityService,
      useFactory: () => {
        return new LeaveCapabilityService({
          leaveRepository,
          timelineRepository,
          studentRepository,
          domainService: new LeaveDomainService(),
        });
      },
    },
  ],
  exports: [LeaveCapabilityService],
})
export class LeaveModule {}
