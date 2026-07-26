import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma';
import { QueryDormDto, CheckDormDto } from './dto';
import { TimelineEventType, TimelineEventSource } from '@prisma/client';

@Injectable()
export class DormService {
  private readonly logger = new Logger('DormService');

  constructor(private prisma: PrismaService) {}

  async findAllDormitories() {
    return this.prisma.dormBuilding.findMany({
      where: { deletedAt: null },
      include: {
        manager: { select: { id: true, name: true } },
        _count: { select: { rooms: true } },
      },
    });
  }

  async findOneDormitory(id: string) {
    const dorm = await this.prisma.dormBuilding.findUnique({
      where: { id, deletedAt: null },
      include: {
        manager: { select: { id: true, name: true, phone: true } },
        rooms: {
          where: { deletedAt: null },
          orderBy: [{ floor: 'asc' }, { roomNo: 'asc' }],
          include: { _count: { select: { students: true } } },
        },
      },
    });
    if (!dorm) throw new NotFoundException('公寓不存在');
    return dorm;
  }

  async findRooms(query: QueryDormDto) {
    const where: any = { deletedAt: null };
    if (query.dormitoryId) where.buildingId = String(query.dormitoryId);
    if (query.floor !== undefined) where.floor = query.floor;

    const [list, total] = await Promise.all([
      this.prisma.dormRoom.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: [{ floor: 'asc' }, { roomNo: 'asc' }],
        include: {
          building: { select: { id: true, name: true } },
          _count: { select: { students: true } },
        },
      }),
      this.prisma.dormRoom.count({ where }),
    ]);

    return { list, total, page: query.page, pageSize: query.pageSize };
  }

  async findOneRoom(id: string) {
    const room = await this.prisma.dormRoom.findUnique({
      where: { id, deletedAt: null },
      include: {
        building: { select: { id: true, name: true, gender: true } },
        students: {
          where: { deletedAt: null },
          select: {
            id: true, studentNo: true, name: true, gender: true,
            class: { select: { id: true, name: true } },
            bedNo: true,
          },
        },
      },
    });
    if (!room) throw new NotFoundException('寝室不存在');
    return room;
  }

  async checkRoom(id: string, dto: CheckDormDto, user: any) {
    const room = await this.findOneRoom(id);

    const results = await this.prisma.$transaction(async (tx) => {
      const records = [];
      for (const studentId of dto.studentIds) {
        const eventType = this.mapCheckStatusToEventType(dto.status);
        const timeline = await tx.timelineEvent.create({
          data: {
            eventType,
            eventSource: 'DORM' as TimelineEventSource,
            sourceEventId: room.id,
            studentId: String(studentId),
            operatorId: user.id,
            operatorName: user.name,
            operatorRole: 'DORM_MANAGER',
            metadata: {
              title: dto.status === 'NORMAL' ? '查寝正常' : '查寝异常',
              description: `${room.building.name} ${room.roomNo} 查寝：${dto.status}${dto.remark ? `，备注：${dto.remark}` : ''}`,
              roomId: room.id,
              roomNo: room.roomNo,
              status: dto.status,
              remark: dto.remark,
            },
            occurredAt: new Date(),
            isSystem: false,
          },
        });
        records.push(timeline);
      }
      return records;
    });

    this.logger.log(`查寝 ${room.roomNo}: ${dto.status}, 学生 ${dto.studentIds.length} 人`);
    return { roomId: room.id, checkedCount: dto.studentIds.length, status: dto.status, records: results };
  }

  async getStatistics() {
    const [dormitories, totalRooms, totalStudents, totalBoarding] = await Promise.all([
      this.prisma.dormBuilding.count({ where: { deletedAt: null } }),
      this.prisma.dormRoom.count({ where: { deletedAt: null } }),
      this.prisma.student.count({ where: { deletedAt: null } }),
      this.prisma.student.count({ where: { boardingType: 'BOARDING', deletedAt: null } }),
    ]);

    const rooms = await this.prisma.dormRoom.findMany({
      where: { deletedAt: null },
      select: { capacity: true, currentCount: true },
    });

    const totalCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0);
    const currentCount = rooms.reduce((sum, r) => sum + r.currentCount, 0);

    return {
      dormitories,
      totalRooms,
      totalStudents,
      totalBoarding,
      totalCapacity,
      currentCount,
      occupancyRate: totalCapacity > 0 ? Math.round((currentCount / totalCapacity) * 100) : 0,
      emptyBeds: totalCapacity - currentCount,
    };
  }

  private mapCheckStatusToEventType(status: string): TimelineEventType {
    const map: Record<string, TimelineEventType> = {
      'NORMAL': 'DORM_CHECKED_IN' as TimelineEventType,
      'ABSENT': 'DORM_ABSENT' as TimelineEventType,
      'LATE': 'DORM_LATE' as TimelineEventType,
      'NIGHT_OUT': 'DORM_ABSENT' as TimelineEventType,
    };
    return map[status] || ('DORM_CHECKED_IN' as TimelineEventType);
  }
}
