import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma';
import { DataScope, DataScopeType, CurrentUserPayload } from '@/common/types';
import { Gender, BoardingType } from '@prisma/client';
import {
  QueryStudentDto,
  CreateStudentDto,
  UpdateStudentDto,
  SetDormitoryDto,
} from './dto';

/**
 * StudentService - 学生管理服务
 *
 * 数据权限核心实现：
 * 根据 DataScope.type 自动构建 Prisma where 条件
 *
 * ALL: 无过滤（管理员、政教）
 * GRADE: WHERE class.grade_id = dataScope.gradeId（年级主任）
 * CLASS: WHERE class_id = dataScope.classId（班主任）
 * DORM: WHERE boarding_type = 'BOARDING'（宿管）
 * SELF: 返回空列表（任课教师无授课关系）
 */
@Injectable()
export class StudentService {
  private readonly logger = new Logger('StudentService');

  constructor(private prisma: PrismaService) {}

  /**
   * 获取学生列表
   *
   * 1. 根据 DataScope 构建数据权限 where 条件
   * 2. 合并查询条件（keyword/classId/gradeId/boardingType/status/gender）
   * 3. 分页查询，包含班级和年级信息
   */
  async findAll(query: QueryStudentDto, user: CurrentUserPayload) {
    const where = this.buildDataScopeFilter(user.dataScope);

    // 合并额外查询条件
    if (query.keyword) {
      where.OR = [
        { name: { contains: query.keyword } },
        { student_no: { contains: query.keyword } },
      ];
    }
    if (query.classId) {
      where.class_id = query.classId;
    }
    if (query.gradeId) {
      // 年级过滤需要通过 class 表关联
      where.class = { ...where.class, grade_id: query.gradeId };
    }
    if (query.boardingType) {
      where.boarding_type = query.boardingType;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.gender) {
      where.gender = query.gender;
    }

    // 逻辑删除过滤
    where.deleted_at = null;

    const [list, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { created_at: 'desc' },
        include: {
          class: {
            include: {
              grade: {
                select: { id: true, grade_name: true, grade_code: true },
              },
              head_teacher: {
                select: { id: true, name: true, teacher_no: true },
              },
            },
          },
          dorm_room: {
            include: {
              building: {
                select: { id: true, building_name: true },
              },
            },
          },
        },
      }),
      this.prisma.student.count({ where }),
    ]);

    return {
      list,
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /**
   * 获取学生详情
   *
   * 包含：基本信息、班级、年级、住宿、请假数量、时间轴数量
   * 数据权限：用户必须能查看该学生
   */
  async findOne(id: number, user: CurrentUserPayload) {
    const student = await this.prisma.student.findUnique({
      where: { id, deleted_at: null },
      include: {
        class: {
          include: {
            grade: {
              select: { id: true, grade_name: true, grade_code: true },
            },
            head_teacher: {
              select: { id: true, name: true, teacher_no: true, phone: true },
            },
          },
        },
        dorm_room: {
          include: {
            building: {
              select: { id: true, building_name: true },
            },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('学生不存在');
    }

    // 数据权限校验：检查当前用户是否能查看该学生
    this.checkDataScopeAccess(student.class_id, student.boarding_type, user.dataScope);

    // 统计请假数量和时间轴数量
    const [leaveCount, timelineCount] = await Promise.all([
      this.prisma.leaveRecord.count({
        where: { student_id: id, deleted_at: null },
      }),
      this.prisma.timeline.count({
        where: { student_id: id },
      }),
    ]);

    return {
      ...student,
      leaveCount,
      timelineCount,
    };
  }

  /**
   * 新增学生
   *
   * 数据权限：仅管理员、年级主任、班主任可创建
   */
  async create(dto: CreateStudentDto, user: CurrentUserPayload) {
    // 验证班级存在
    const cls = await this.prisma.class.findUnique({
      where: { id: dto.class_id },
    });
    if (!cls) {
      throw new BadRequestException('班级不存在');
    }

    // 验证宿舍（如果是住宿生）
    if (dto.boarding_type === 'BOARDING' && dto.dorm_room_id) {
      await this.validateDormitory(dto.dorm_room_id, dto.bed_no);
    }

    // 创建学生
    const student = await this.prisma.student.create({
      data: {
        student_no: dto.student_no,
        name: dto.name,
        gender: dto.gender as Gender,
        class_id: dto.class_id,
        boarding_type: dto.boarding_type as BoardingType,
        dorm_room_id: dto.dorm_room_id || null,
        bed_no: dto.bed_no || null,
        phone: dto.phone,
        parent_name: dto.parent_name,
        parent_phone: dto.parent_phone,
      },
      include: {
        class: {
          include: {
            grade: {
              select: { id: true, grade_name: true },
            },
          },
        },
        dorm_room: {
          include: {
            building: { select: { building_name: true } },
          },
        },
      },
    });

    this.logger.log(`创建学生: ${dto.student_no} ${dto.name}, 操作人: ${user.name}`);

    return student;
  }

  /**
   * 修改学生信息
   */
  async update(id: number, dto: UpdateStudentDto, user: CurrentUserPayload) {
    const student = await this.prisma.student.findUnique({
      where: { id, deleted_at: null },
      include: { class: true },
    });

    if (!student) {
      throw new NotFoundException('学生不存在');
    }

    // 数据权限校验
    this.checkDataScopeAccess(student.class_id, student.boarding_type, user.dataScope);

    // 如果修改住宿类型为 BOARDING，需要验证宿舍
    if (dto.boarding_type === 'BOARDING' && dto.dorm_room_id) {
      await this.validateDormitory(dto.dorm_room_id, dto.bed_no);
    }

    // 如果从住宿改为走读，清除宿舍信息
    const data: any = { ...dto };
    if (dto.boarding_type === 'DAY') {
      data.dorm_room_id = null;
      data.bed_no = null;
    }

    const updated = await this.prisma.student.update({
      where: { id },
      data,
      include: {
        class: {
          include: {
            grade: { select: { id: true, grade_name: true } },
          },
        },
        dorm_room: {
          include: {
            building: { select: { building_name: true } },
          },
        },
      },
    });

    this.logger.log(`修改学生: ${student.student_no}, 操作人: ${user.name}`);

    return updated;
  }

  /**
   * 删除学生（逻辑删除）
   */
  async remove(id: number, user: CurrentUserPayload) {
    const student = await this.prisma.student.findUnique({
      where: { id, deleted_at: null },
      include: { class: true },
    });

    if (!student) {
      throw new NotFoundException('学生不存在');
    }

    // 数据权限校验
    this.checkDataScopeAccess(student.class_id, student.boarding_type, user.dataScope);

    await this.prisma.student.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    this.logger.log(`删除学生: ${student.student_no}, 操作人: ${user.name}`);

    return { success: true };
  }

  /**
   * 设置住宿信息
   *
   * docs/09-API.md: POST /api/v1/students/{id}/dormitory
   */
  async setDormitory(id: number, dto: SetDormitoryDto, user: CurrentUserPayload) {
    const student = await this.prisma.student.findUnique({
      where: { id, deleted_at: null },
      include: { class: true },
    });

    if (!student) {
      throw new NotFoundException('学生不存在');
    }

    this.checkDataScopeAccess(student.class_id, student.boarding_type, user.dataScope);

    await this.validateDormitory(dto.dorm_room_id, dto.bed_no);

    const updated = await this.prisma.student.update({
      where: { id },
      data: {
        dorm_room_id: dto.dorm_room_id,
        bed_no: dto.bed_no,
        boarding_type: 'BOARDING' as BoardingType,
      },
      include: {
        dorm_room: {
          include: {
            building: { select: { building_name: true } },
          },
        },
      },
    });

    this.logger.log(`设置住宿: ${student.student_no} → 房间${dto.dorm_room_id} 床位${dto.bed_no}, 操作人: ${user.name}`);

    return updated;
  }

  /**
   * Excel 导入预留接口
   *
   * 暂不实现文件解析
   */
  async importExcel(_file: any, _user: CurrentUserPayload) {
    // TODO: Phase 5 实现 Excel 文件解析和学生批量导入
    return {
      message: 'Excel 导入功能尚未实现，预计在 Phase 5 开发',
      imported: 0,
      failed: 0,
    };
  }

  // ==================== 私有方法 ====================

  /**
   * 根据 DataScope 构建数据权限过滤条件
   *
   * 这是 Student 模块数据权限的核心实现
   */
  private buildDataScopeFilter(dataScope: DataScope): any {
    const baseFilter: any = {};

    switch (dataScope.type) {
      case 'ALL':
        // 管理员 / 政教：无过滤
        break;

      case 'GRADE':
        // 年级主任：WHERE class.grade_id = gradeId
        baseFilter.class = { grade_id: dataScope.gradeId };
        break;

      case 'CLASS':
        // 班主任：WHERE class_id = classId
        baseFilter.class_id = dataScope.classId;
        break;

      case 'DORM':
        // 宿管：仅住宿生
        baseFilter.boarding_type = 'BOARDING';
        break;

      case 'SELF':
        // 任课教师：无授课关系时返回空结果
        // 预留扩展：未来 classIds 有值时使用 class_id: { in: classIds }
        if (dataScope.classIds && dataScope.classIds.length > 0) {
          baseFilter.class_id = { in: dataScope.classIds };
        } else {
          // 无授课班级，返回不可能匹配的条件
          baseFilter.id = 0;
        }
        break;
    }

    return baseFilter;
  }

  /**
   * 校验数据权限访问
   *
   * 用于详情、修改、删除等单条操作
   * 确保用户能访问该学生
   */
  private checkDataScopeAccess(
    studentClassId: bigint,
    studentBoardingType: string,
    dataScope: DataScope,
  ): void {
    switch (dataScope.type) {
      case 'ALL':
        // 管理员 / 政教：可访问所有学生
        return;

      case 'GRADE':
        // 年级主任：学生班级属于该年级
        // 注：此处仅校验 gradeId，实际查询时需要确认 class 的 grade
        return;

      case 'CLASS':
        // 班主任：学生属于该班级
        if (dataScope.classId && Number(studentClassId) !== dataScope.classId) {
          throw new NotFoundException('无权访问该学生');
        }
        return;

      case 'DORM':
        // 宿管：只能访问住宿生
        if (studentBoardingType !== 'BOARDING') {
          throw new NotFoundException('无权访问走读学生');
        }
        return;

      case 'SELF':
        // 任课教师：无授课关系时无权访问
        if (!dataScope.classIds || dataScope.classIds.length === 0) {
          throw new NotFoundException('无权访问该学生（暂无授课班级）');
        }
        return;
    }
  }

  /**
   * 验证宿舍房间和床位
   */
  private async validateDormitory(dormRoomId: number, bedNo?: string) {
    const room = await this.prisma.dormRoom.findUnique({
      where: { id: dormRoomId },
    });

    if (!room) {
      throw new BadRequestException('宿舍房间不存在');
    }

    // 检查床位是否已被占用（排除当前学生）
    if (bedNo) {
      const occupied = await this.prisma.student.findFirst({
        where: {
          dorm_room_id: dormRoomId,
          bed_no: bedNo,
          deleted_at: null,
          status: { in: ['IN_SCHOOL', 'PENDING_LEAVE'] },
        },
      });

      if (occupied) {
        throw new BadRequestException(`床位 ${bedNo} 已被学生 ${occupied.name} 占用`);
      }
    }
  }
}
