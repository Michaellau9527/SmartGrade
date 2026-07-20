/**
 * DormRepository — 宿舍仓储
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.3 §5
 *
 * 设计：
 * - DormBuilding → DormRoom → Student (1:N:N)
 * - 宿管 = Teacher.managedDormBuildings (反向关系)
 * - 查寝应到学生 = 住宿生 + 状态 ON_CAMPUS + 不在校外
 */

import type { Prisma, DormBuilding, DormRoom } from '@prisma/client';
import { BaseRepository } from './base.repository';

export class DormRepository extends BaseRepository {
  // ============================================================
  // Building
  // ============================================================

  async findBuildingsBySchool(schoolId: string): Promise<DormBuilding[]> {
    return this.db.dormBuilding.findMany({
      where: { schoolId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async findBuildingById(id: string) {
    return this.db.dormBuilding.findUnique({
      where: { id },
      include: { rooms: true, manager: true },
    });
  }

  async findBuildingsByManager(teacherId: string) {
    return this.db.dormBuilding.findMany({
      where: { managerId: teacherId, deletedAt: null },
      include: { rooms: true },
    });
  }

  // ============================================================
  // Room
  // ============================================================

  async findRoomsByBuilding(buildingId: string): Promise<DormRoom[]> {
    return this.db.dormRoom.findMany({
      where: { buildingId, deletedAt: null },
      orderBy: [{ floor: 'asc' }, { roomNo: 'asc' }],
    });
  }

  async findRoomById(id: string) {
    return this.db.dormRoom.findUnique({
      where: { id },
      include: { building: true, students: { where: { deletedAt: null } } },
    });
  }

  /**
   * 查寝应到学生（v1.2 §2.5.4 关键方法）
   *
   * 自动过滤：
   * - 走读生（不是住宿生）
   * - 已离校的学生
   */
  async findShouldCheckInStudents(buildingId: string) {
    return this.db.student.findMany({
      where: {
        dorm: { buildingId },
        boardingType: 'BOARDING',
        currentStatus: 'ON_CAMPUS',
        currentLocation: { not: 'OFF_CAMPUS' },
        deletedAt: null,
      },
      include: { dorm: true, class: { include: { grade: true } } },
      orderBy: [{ dorm: { floor: 'asc' } }, { dorm: { roomNo: 'asc' } }, { name: 'asc' }],
    });
  }

  // ============================================================
  // 写入
  // ============================================================

  async createBuilding(data: Prisma.DormBuildingCreateInput): Promise<DormBuilding> {
    return this.db.dormBuilding.create({ data });
  }

  async createRoom(data: Prisma.DormRoomCreateInput): Promise<DormRoom> {
    return this.db.dormRoom.create({ data });
  }

  async assignStudentToRoom(studentId: string, roomId: string, bedNo?: string) {
    return this.db.student.update({
      where: { id: studentId },
      data: { dormId: roomId, ...(bedNo && { bedNo }) },
    });
  }
}

export const dormRepository = new DormRepository();
