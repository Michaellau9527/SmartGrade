import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma';
import { QueryDormDto, CheckDormDto } from './dto';

@Injectable()
export class DormService {
  private readonly logger = new Logger('DormService');

  constructor(private prisma: PrismaService) {}

  async findAllDormitories() {
    return this.prisma.dormitory.findMany({
      include: {
        manager: { select: { id: true, name: true } },
        _count: { select: { rooms: true } },
      },
    });
  }

  async findOneDormitory(id: number) {
    const dorm = await this.prisma.dormitory.findUnique({
      where: { id: BigInt(id) },
      include: {
        manager: { select: { id: true, name: true, phone: true } },
        rooms: {
          orderBy: [{ floor: 'asc' }, { room_no: 'asc' }],
          include: { _count: { select: { students: true } } },
        },
      },
    });
    if (!dorm) throw new NotFoundException('公寓不存在');
    return dorm;
  }

  async findRooms(query: QueryDormDto) {
    const where: any = {};
    if (query.dormitoryId) where.building_id = BigInt(query.dormitoryId);
    if (query.floor !== undefined) where.floor = query.floor;

    const [list, total] = await Promise.all([
      this.prisma.dormRoom.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: [{ floor: 'asc' }, { room_no: 'asc' }],
        include: {
          building: { select: { id: true, building_name: true } },
          _count: { select: { students: true } },
        },
      }),
      this.prisma.dormRoom.count({ where }),
    ]);

    return { list, total, page: query.page, pageSize: query.pageSize };
  }

  async findOneRoom(id: number) {
    const room = await this.prisma.dormRoom.findUnique({
      where: { id: BigInt(id) },
      include: {
        building: { select: { id: true, building_name: true, gender: true } },
        students: {
          select: {
            id: true, student_no: true, name: true, gender: true,
            class: { select: { id: true, class_name: true } },
            bed_no: true,
          },
        },
      },
    });
    if (!room) throw new NotFoundException('寝室不存在');
    return room;
  }

  async checkRoom(id: number, dto: CheckDormDto, user: any) {
    const room = await this.findOneRoom(id);

    const results = await this.prisma.$transaction(async (tx) => {
      const records = [];
      for (const studentId of dto.studentIds) {
        const timeline = await tx.timeline.create({
          data: {
            timeline_no: `T${Date.now()}${Math.floor(Math.random() * 1000)}`,
            student_id: BigInt(studentId),
            event_type: dto.status === 'NORMAL' ? 'CHECKOUT_DORM' : 'DORM_EXCEPTION',
            event_title: dto.status === 'NORMAL' ? '查寝正常' : '查寝异常',
            event_description: `${room.building.building_name} ${room.room_no} 查寝：${dto.status}${dto.remark ? `，备注：${dto.remark}` : ''}`,
            operator_teacher_id: BigInt(user.id),
            operator_teacher_name: user.name,
            operator_role: 'DORM_MANAGER',
            event_source: 'DORM',
            source_id: room.id,
            is_system: false,
          },
        });
        records.push(timeline);
      }
      return records;
    });

    this.logger.log(`查寝 ${room.room_no}: ${dto.status}, 学生 ${dto.studentIds.length} 人`);
    return { roomId: room.id, checkedCount: dto.studentIds.length, status: dto.status, records: results };
  }

  async getStatistics() {
    const [dormitories, totalRooms, totalStudents, totalBoarding] = await Promise.all([
      this.prisma.dormitory.count(),
      this.prisma.dormRoom.count(),
      this.prisma.student.count({ where: { deleted_at: null } }),
      this.prisma.student.count({ where: { boarding_type: 'BOARDING', deleted_at: null } }),
    ]);

    const rooms = await this.prisma.dormRoom.findMany({
      select: { capacity: true, current_count: true },
    });

    const totalCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0);
    const currentCount = rooms.reduce((sum, r) => sum + r.current_count, 0);

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
}
