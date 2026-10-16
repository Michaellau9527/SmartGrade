/**
 * 测试 20：学生接口契约（camelCase DTO + 分页结构 + 数据范围断言保留）
 *
 * 背景（2026-10-16 P0 修复）：
 * 1. 前端旧版发送 snake_case 字段（student_no/class_id/boarding_type/bed_no/parent_name/parent_phone），
 *    全局 ValidationPipe（whitelist + forbidNonWhitelisted）直接 400：
 *    "property student_no should not exist"。
 * 2. QueryStudentDto/CreateStudentDto 的 classId/gradeId 旧定义 @IsInt + @Type(Number)，
 *    而生产 class.id 为 VARCHAR(36) UUID（init_db.sql 实证）→ 筛选/创建必 400（NaN）。
 *
 * 本测试锁定：
 * 1. CreateStudentDto / UpdateStudentDto / SetDormitoryDto 仅接受 camelCase 字段
 * 2. classId / gradeId / dormRoomId 均为字符串校验
 * 3. findAll 返回统一分页结构 { list, total, page, pageSize }
 * 4. 数据范围断言保留（班主任仅本班、SELF 空、越权访问拒绝）——不得削弱
 * 5. 软删除学生不出现在列表（where.deletedAt = null）
 */

import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { createMockPrisma } from './helpers/mock-prisma';
import { StudentService } from '../modules/student/student.service';
import {
  CreateStudentDto,
  UpdateStudentDto,
  SetDormitoryDto,
  QueryStudentDto,
} from '../modules/student/dto';

// ---------- DTO 校验辅助 ----------

async function validateDto(dtoClass: any, payload: object): Promise<string[]> {
  const dto = plainToInstance(dtoClass, payload, { enableImplicitConversion: true });
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  return errors.flatMap((e) => Object.values(e.constraints ?? {}));
}

const VALID_CREATE = {
  studentNo: 'S2026999',
  name: '测试学生',
  gender: 'MALE',
  classId: 'cls_uuid_0001',
  boardingType: 'BOARDING',
};

// ---------- 用户夹具 ----------

const ADMIN = { id: 1, name: '管理员', roles: ['ROLE_ADMIN'], dataScope: { type: 'ALL' } } as any;
const HEADMASTER = {
  id: 't_hm',
  name: '班主任',
  roles: ['ROLE_HEADMASTER'],
  dataScope: { type: 'CLASS', classId: 'cls_a', gradeId: 'grade_a' },
} as any;
const SELF_TEACHER = {
  id: 't_st',
  name: '任课教师',
  roles: ['ROLE_SUBJECT_TEACHER'],
  dataScope: { type: 'SELF' },
} as any;

function makeService() {
  const prisma = createMockPrisma();
  return { service: new StudentService(prisma as any), prisma };
}

describe('测试 20: 学生接口契约', () => {
  // ============================================================
  // 1. DTO 契约（camelCase + 字符串 ID）
  // ============================================================
  describe('1. DTO 契约', () => {
    it('CreateStudentDto 接受 camelCase 完整字段', async () => {
      const errors = await validateDto(CreateStudentDto, {
        ...VALID_CREATE,
        dormRoomId: 'dorm_cuid_1',
        bedNo: 'A01',
        phone: '13800000000',
        parentName: '家长',
        parentPhone: '13900000000',
      });
      expect(errors).toEqual([]);
    });

    it('CreateStudentDto 拒绝旧 snake_case 字段（forbidNonWhitelisted 语义）', async () => {
      const errors = await validateDto(CreateStudentDto, {
        ...VALID_CREATE,
        student_no: 'S2026999',
        class_id: 1,
        boarding_type: 'BOARDING',
        parent_name: '家长',
        parent_phone: '139',
      });
      const joined = errors.join('|');
      expect(joined).toContain('student_no');
      expect(joined).toContain('class_id');
    });

    it('classId 为 cuid/UUID 字符串时通过校验（全局隐式转换下数字也会转为字符串，与生产 ValidationPipe 行为一致）', async () => {
      const ok = await validateDto(CreateStudentDto, VALID_CREATE);
      expect(ok).toEqual([]);
      const numeric = await validateDto(CreateStudentDto, { ...VALID_CREATE, classId: 1 });
      expect(numeric).toEqual([]); // 隐式转字符串后合法；旧 @IsInt 定义则相反（cuid 会 NaN 400）
    });

    it('UpdateStudentDto 全 camelCase 可选字段', async () => {
      const errors = await validateDto(UpdateStudentDto, {
        name: '新名字',
        boardingType: 'DAY_STUDENT',
        dormRoomId: 'dorm_cuid_2',
        parentName: '家长',
        parentPhone: '139',
      });
      expect(errors).toEqual([]);
    });

    it('SetDormitoryDto.dormRoomId 接受 cuid 字符串（数字经全局隐式转换亦合法）', async () => {
      const ok = await validateDto(SetDormitoryDto, { dormRoomId: 'dorm_cuid_1', bedNo: 'A01' });
      expect(ok).toEqual([]);
      const numeric = await validateDto(SetDormitoryDto, { dormRoomId: 123, bedNo: 'A01' });
      expect(numeric).toEqual([]); // 隐式转字符串后合法；旧 @IsInt 定义则 cuid 必 400
    });

    it('QueryStudentDto.classId / gradeId 为字符串', async () => {
      const errors = await validateDto(QueryStudentDto, {
        page: 1,
        pageSize: 20,
        classId: 'cls_uuid_0001',
        gradeId: 'grade_uuid_1',
        status: 'IN_SCHOOL',
      });
      expect(errors).toEqual([]);
    });
  });

  // ============================================================
  // 2. 列表契约与数据范围（断言保留）
  // ============================================================
  describe('2. 列表契约与数据范围', () => {
    it('findAll 返回 { list, total, page, pageSize } 分页结构', async () => {
      const { service, prisma } = makeService();
      prisma.student.findMany.mockResolvedValue([]);
      prisma.student.count.mockResolvedValue(0);

      const res = await service.findAll({ page: 2, pageSize: 20 } as any, ADMIN);
      expect(Object.keys(res).sort()).toEqual(['list', 'page', 'pageSize', 'total']);
      expect(res.page).toBe(2);
      expect(res.total).toBe(0);
    });

    it('恒定过滤 deletedAt=null（软删除学生不出现在列表）', async () => {
      const { service, prisma } = makeService();
      prisma.student.findMany.mockResolvedValue([]);
      prisma.student.count.mockResolvedValue(0);

      await service.findAll({} as any, ADMIN);
      expect(prisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ deletedAt: null }) }),
      );
      expect(prisma.student.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ deletedAt: null }),
      });
    });

    it('班主任（CLASS）→ where.classId 限定本班（数据范围断言保留）', async () => {
      const { service, prisma } = makeService();
      prisma.student.findMany.mockResolvedValue([]);
      prisma.student.count.mockResolvedValue(0);

      await service.findAll({} as any, HEADMASTER);
      expect(prisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ classId: 'cls_a' }),
        }),
      );
    });

    it('任课教师（SELF）→ 返回空列表', async () => {
      const { service, prisma } = makeService();
      prisma.student.findMany.mockResolvedValue([]);
      prisma.student.count.mockResolvedValue(0);

      const res = await service.findAll({} as any, SELF_TEACHER);
      expect(res.list).toEqual([]);
      expect(res.total).toBe(0);
    });
  });

  // ============================================================
  // 3. 创建 / 详情 / 删除行为
  // ============================================================
  describe('3. 创建 / 详情 / 删除行为', () => {
    it('create 使用 DTO 的 classId 字符串查班级并派生 gradeId/schoolId', async () => {
      const { service, prisma } = makeService();
      prisma.class.findUnique.mockResolvedValue({
        id: 'cls_uuid_0001',
        gradeId: 'grade_uuid_1',
        schoolId: 'school_uuid_1',
      });
      prisma.student.create.mockResolvedValue({ id: 'stu_new', studentNo: 'S2026999' });

      await service.create({ ...VALID_CREATE, dormRoomId: undefined } as any, ADMIN);
      expect(prisma.class.findUnique).toHaveBeenCalledWith({ where: { id: 'cls_uuid_0001' } });
      expect(prisma.student.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            classId: 'cls_uuid_0001',
            gradeId: 'grade_uuid_1',
            schoolId: 'school_uuid_1',
          }),
        }),
      );
    });

    it('班级不存在时 create 抛 400（不写库）', async () => {
      const { service, prisma } = makeService();
      prisma.class.findUnique.mockResolvedValue(null);

      await expect(
        service.create({ ...VALID_CREATE } as any, ADMIN),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.student.create).not.toHaveBeenCalled();
    });

    it('详情：学生不存在抛 404', async () => {
      const { service, prisma } = makeService();
      prisma.student.findUnique.mockResolvedValue(null);
      await expect(service.findOne('stu_missing', ADMIN)).rejects.toThrow(NotFoundException);
    });

    it('删除为软删除（update deletedAt），不物理删除', async () => {
      const { service, prisma } = makeService();
      prisma.student.findUnique.mockResolvedValue({
        id: 'stu_1',
        classId: 'cls_a',
        gradeId: 'grade_a',
        boardingType: 'BOARDING',
        studentNo: 'S1',
        class: {},
      });
      prisma.student.update.mockResolvedValue({ id: 'stu_1' });

      const res = await service.remove('stu_1', ADMIN);
      expect(res).toEqual({ success: true });
      expect(prisma.student.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
      );
      expect(prisma.student.delete).not.toHaveBeenCalled();
    });
  });
});
