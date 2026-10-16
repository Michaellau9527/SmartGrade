import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma';
import { DataScope, DataScopeType, CurrentUserPayload } from '@/common/types';
import { Gender, BoardingType, StudentStatus } from '@prisma/client';
import {
  QueryStudentDto,
  CreateStudentDto,
  UpdateStudentDto,
  SetDormitoryDto,
} from './dto';
import {
  sanitizeStudentKeyword,
  computeStudentListPagination,
  STUDENT_KEYWORD_MAX_LEN,
} from './student-query.util';

/**
 * StudentService - 学生管理服务
 *
 * 数据权限核心实现：
 * 根据 DataScope.type 自动构建 Prisma where 条件
 *
 * ALL: 无过滤（管理员、政教）
 * GRADE: WHERE class.gradeId = dataScope.gradeId（年级主任）
 * CLASS: WHERE classId = dataScope.classId（班主任）
 * DORM: WHERE boardingType = 'BOARDING'（宿管）
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
    // 搜索关键词：去首尾空白、空关键词视为「无搜索」；超长抛错（防异常输入/查询放大）
    let keyword: string | null = null;
    try {
      keyword = sanitizeStudentKeyword(query.keyword);
    } catch {
      throw new BadRequestException(
        `搜索关键词长度不能超过 ${STUDENT_KEYWORD_MAX_LEN} 个字符`,
      );
    }
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { studentNo: { contains: keyword } },
      ];
    }
    if (query.classId) {
      where.classId = String(query.classId);
    }
    if (query.gradeId) {
      // 年级过滤需要通过 class 表关联
      where.class = { ...where.class, gradeId: String(query.gradeId) };
    }
    if (query.boardingType) {
      where.boardingType = query.boardingType as BoardingType;
    }
    if (query.status) {
      where.currentStatus = this.mapStatusToCurrentStatus(query.status);
    }
    if (query.gender) {
      where.gender = query.gender as Gender;
    }

    // 逻辑删除过滤
    where.deletedAt = null;

    // 分页：page/pageSize 受 DTO 约束（page>=1，1<=pageSize<=100）；
    // 列表默认拉满到 100，避免「一个班被默认 20 截断」（验收报告 C10），
    // 同时硬上限 100 防 DoS。DataScope 过滤保持原样不变。
    const { skip, take, page: effectivePage, pageSize: effectivePageSize } =
      computeStudentListPagination(query.page, query.pageSize);

    const [list, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          class: {
            include: {
              grade: {
                select: { id: true, name: true, code: true },
              },
              headTeacher: {
                select: { id: true, name: true, teacherNo: true },
              },
            },
          },
          dorm: {
            include: {
              building: {
                select: { id: true, name: true },
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
      page: effectivePage,
      pageSize: effectivePageSize,
    };
  }

  /**
   * 获取学生详情
   *
   * 包含：基本信息、班级、年级、住宿、请假数量、时间轴数量
   * 数据权限：用户必须能查看该学生
   */
  async findOne(id: string, user: CurrentUserPayload) {
    const student = await this.prisma.student.findUnique({
      where: { id, deletedAt: null },
      include: {
        class: {
          include: {
            grade: {
              select: { id: true, name: true, code: true },
            },
            headTeacher: {
              select: { id: true, name: true, teacherNo: true, phone: true },
            },
          },
        },
        dorm: {
          include: {
            building: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('学生不存在');
    }

    // 数据权限校验：检查当前用户是否能查看该学生
    this.checkDataScopeAccess(student.classId, student.gradeId, student.boardingType, user.dataScope);

    // 统计请假数量和时间轴数量
    const [leaveCount, timelineCount] = await Promise.all([
      this.prisma.leaveRecord.count({
        where: { studentId: id, deletedAt: null },
      }),
      this.prisma.timelineEvent.count({
        where: { studentId: id },
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
      where: { id: String(dto.classId) },
    });
    if (!cls) {
      throw new BadRequestException('班级不存在');
    }

    // 数据范围校验：仅可在本人可管理的班级/年级下新增学生，防止跨班注入
    this.assertClassInScope(cls.id, cls.gradeId, user.dataScope);

    // 验证宿舍（如果是住宿生）
    if (dto.boardingType === 'BOARDING' && dto.dormRoomId) {
      await this.validateDormitory(String(dto.dormRoomId), dto.bedNo);
    }

    // 创建学生
    const student = await this.prisma.student.create({
      data: {
        studentNo: dto.studentNo,
        name: dto.name,
        gender: dto.gender as Gender,
        classId: String(dto.classId),
        gradeId: cls.gradeId,
        schoolId: cls.schoolId,
        boardingType: dto.boardingType as BoardingType,
        dormId: dto.dormRoomId ? String(dto.dormRoomId) : null,
        bedNo: dto.bedNo || null,
        phone: dto.phone,
        enrolledAt: new Date(),
      },
      include: {
        class: {
          include: {
            grade: {
              select: { id: true, name: true },
            },
          },
        },
        dorm: {
          include: {
            building: { select: { name: true } },
          },
        },
      },
    });

    this.logger.log(`创建学生: ${dto.studentNo} ${dto.name}, 操作人: ${user.name}`);

    return student;
  }

  /**
   * 修改学生信息
   */
  async update(id: string, dto: UpdateStudentDto, user: CurrentUserPayload) {
    const student = await this.prisma.student.findUnique({
      where: { id, deletedAt: null },
      include: { class: true },
    });

    if (!student) {
      throw new NotFoundException('学生不存在');
    }

    // 数据权限校验
    this.checkDataScopeAccess(student.classId, student.gradeId, student.boardingType, user.dataScope);

    // 如果修改住宿类型为 BOARDING，需要验证宿舍
    if (dto.boardingType === 'BOARDING' && dto.dormRoomId) {
      await this.validateDormitory(String(dto.dormRoomId), dto.bedNo);
    }

    // 如果从住宿改为走读，清除宿舍信息
    const data: any = { ...dto };
    if (dto.boardingType === 'DAY_STUDENT') {
      data.dormId = null;
      data.bedNo = null;
    } else if (dto.dormRoomId !== undefined) {
      data.dormId = dto.dormRoomId ? String(dto.dormRoomId) : null;
    }

    // 删除 DTO 中不存在于 Student 模型的字段
    delete data.parentName;
    delete data.parentPhone;
    delete data.dormRoomId;

    const updated = await this.prisma.student.update({
      where: { id },
      data,
      include: {
        class: {
          include: {
            grade: { select: { id: true, name: true } },
          },
        },
        dorm: {
          include: {
            building: { select: { name: true } },
          },
        },
      },
    });

    this.logger.log(`修改学生: ${student.studentNo}, 操作人: ${user.name}`);

    return updated;
  }

  /**
   * 删除学生（逻辑删除）
   */
  async remove(id: string, user: CurrentUserPayload) {
    const student = await this.prisma.student.findUnique({
      where: { id, deletedAt: null },
      include: { class: true },
    });

    if (!student) {
      throw new NotFoundException('学生不存在');
    }

    // 数据权限校验
    this.checkDataScopeAccess(student.classId, student.gradeId, student.boardingType, user.dataScope);

    await this.prisma.student.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`删除学生: ${student.studentNo}, 操作人: ${user.name}`);

    return { success: true };
  }

  /**
   * 设置住宿信息
   *
   * docs/09-API.md: POST /api/v1/students/{id}/dormitory
   */
  async setDormitory(id: string, dto: SetDormitoryDto, user: CurrentUserPayload) {
    const student = await this.prisma.student.findUnique({
      where: { id, deletedAt: null },
      include: { class: true },
    });

    if (!student) {
      throw new NotFoundException('学生不存在');
    }

    this.checkDataScopeAccess(student.classId, student.gradeId, student.boardingType, user.dataScope);

    await this.validateDormitory(String(dto.dormRoomId), dto.bedNo);

    const updated = await this.prisma.student.update({
      where: { id },
      data: {
        dormId: String(dto.dormRoomId),
        bedNo: dto.bedNo,
        boardingType: 'BOARDING' as BoardingType,
      },
      include: {
        dorm: {
          include: {
            building: { select: { name: true } },
          },
        },
      },
    });

    this.logger.log(`设置住宿: ${student.studentNo} → 房间${dto.dormRoomId} 床位${dto.bedNo}, 操作人: ${user.name}`);

    return updated;
  }

  /**
   * 批量导入学生
   *
   * 逐行校验 → 批量 create → 返回成功/失败统计
   */
  async batchImport(
    students: CreateStudentDto[],
    user: CurrentUserPayload,
  ): Promise<{ success: number; failed: number; errors: { row: number; message: string }[] }> {
    const errors: { row: number; message: string }[] = [];
    const valid: { s: CreateStudentDto; cls: { gradeId: string; schoolId: string } }[] = [];

    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      const row = i + 1;
      // 必填校验
      if (!s.name || !s.name.trim()) { errors.push({ row, message: '姓名不能为空' }); continue; }
      if (!s.studentNo || !s.studentNo.trim()) { errors.push({ row, message: '学号不能为空' }); continue; }
      if (!s.gender || !['MALE', 'FEMALE'].includes(s.gender)) { errors.push({ row, message: `性别无效: ${s.gender}` }); continue; }
      if (!s.boardingType || !['DAY_STUDENT', 'BOARDING'].includes(s.boardingType)) { errors.push({ row, message: `住宿类型无效: ${s.boardingType}` }); continue; }
      if (!s.classId) { errors.push({ row, message: '班级ID不能为空' }); continue; }

      // 逐行解析班级：gradeId/schoolId 取自该学生所属班级（修复跨班共用首行归属问题）
      const cls = await this.prisma.class.findUnique({ where: { id: String(s.classId) } });
      if (!cls) { errors.push({ row, message: '班级不存在' }); continue; }

      // 数据范围校验：每一行的班级都必须在当前用户可管理范围内
      try {
        this.assertClassInScope(cls.id, cls.gradeId, user.dataScope);
      } catch (e: any) {
        errors.push({ row, message: e?.message || '无权在该班级新增学生' });
        continue;
      }

      // 学号重复检查
      const exists = await this.prisma.student.findFirst({
        where: { studentNo: s.studentNo, deletedAt: null },
      });
      if (exists) { errors.push({ row, message: `学号 ${s.studentNo} 已存在` }); continue; }

      valid.push({ s, cls });
    }

    // 批量创建
    if (valid.length > 0) {
      const data = valid.map(({ s, cls }) => ({
        studentNo: s.studentNo.trim(),
        name: s.name.trim(),
        gender: s.gender as Gender,
        classId: String(s.classId),
        gradeId: cls.gradeId,
        schoolId: cls.schoolId,
        boardingType: s.boardingType as BoardingType,
        bedNo: s.bedNo || null,
        phone: s.phone || null,
        enrolledAt: new Date(),
      }));

      await this.prisma.student.createMany({ data, skipDuplicates: true });
    }

    this.logger.log(`批量导入: 成功${valid.length}, 失败${errors.length}`);

    return { success: valid.length, failed: errors.length, errors };
  }

  /**
   * Excel 文件导入（预留）
   */
  async importExcel(_file: any, _user: CurrentUserPayload) {
    return {
      message: 'Excel 文件直传尚未实现，请使用 /students/batch 接口',
      imported: 0,
      failed: 0,
    };
  }

  // ==================== 私有方法 ====================

  /**
   * 校验目标班级是否在当前用户的数据范围内（用于新增 / 导入学生）
   *
   * 防止班主任将学生挂到非本人管理的班级（跨班注入）。
   * ALL：放行；GRADE：班级所属年级必须匹配；CLASS：班级必须精确匹配；
   * DORM / SELF：通常无 student:create 数据范围，拒绝越权创建。
   */
  private assertClassInScope(classId: string, gradeId: string, dataScope: DataScope): void {
    switch (dataScope.type) {
      case 'ALL':
        return;
      case 'GRADE':
        if (dataScope.gradeId && String(gradeId) !== String(dataScope.gradeId)) {
          throw new BadRequestException('无权在该年级下新增学生');
        }
        return;
      case 'CLASS':
        if (dataScope.classId && String(classId) !== String(dataScope.classId)) {
          throw new BadRequestException('无权在该班级下新增学生');
        }
        return;
      case 'DORM':
      case 'SELF':
        throw new BadRequestException('当前角色无权新增学生');
    }
  }

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
        // 年级主任：WHERE class.gradeId = gradeId
        baseFilter.class = { gradeId: dataScope.gradeId };
        break;

      case 'CLASS':
        // 班主任：WHERE classId = classId
        baseFilter.classId = dataScope.classId;
        break;

      case 'DORM':
        // 宿管：仅住宿生
        baseFilter.boardingType = 'BOARDING';
        break;

      case 'SELF':
        // 任课教师：无授课关系时返回空结果
        // 预留扩展：未来 classIds 有值时使用 classId: { in: classIds }
        if (dataScope.classIds && dataScope.classIds.length > 0) {
          baseFilter.classId = { in: dataScope.classIds };
        } else {
          // 无授课班级，返回不可能匹配的条件
          baseFilter.id = '__nonexistent__';
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
    studentClassId: string,
    studentGradeId: string,
    studentBoardingType: string,
    dataScope: DataScope,
  ): void {
    switch (dataScope.type) {
      case 'ALL':
        // 管理员 / 政教：可访问所有学生
        return;

      case 'GRADE':
        // 年级主任：学生必须属于该年级（真实比对，杜绝 IDOR 越权）
        if (dataScope.gradeId && studentGradeId !== String(dataScope.gradeId)) {
          throw new NotFoundException('无权访问该学生（非本年级）');
        }
        return;

      case 'CLASS':
        // 班主任：学生属于该班级
        if (dataScope.classId && studentClassId !== String(dataScope.classId)) {
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
  private async validateDormitory(dormRoomId: string, bedNo?: string) {
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
          dormId: dormRoomId,
          bedNo: bedNo,
          deletedAt: null,
          currentStatus: { in: ['ON_CAMPUS', 'OUT_OF_SCHOOL'] as StudentStatus[] },
        },
      });

      if (occupied) {
        throw new BadRequestException(`床位 ${bedNo} 已被学生 ${occupied.name} 占用`);
      }
    }
  }

  /**
   * 将旧的 status 字符串映射到 currentStatus 枚举
   */
  private mapStatusToCurrentStatus(status: string): StudentStatus | undefined {
    const map: Record<string, StudentStatus> = {
      'IN_SCHOOL': 'ON_CAMPUS' as StudentStatus,
      'PENDING_LEAVE': 'OUT_OF_SCHOOL' as StudentStatus,
      'LEFT_SCHOOL': 'OUT_OF_SCHOOL' as StudentStatus,
    };
    return map[status];
  }
}
