import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma';
import { ClassQueryDto } from './dto/class-query.dto';

type ClassWithSchool = {
  id: string;
  gradeId: string;
  schoolId: string;
  code: string;
  name: string;
  headTeacherId: string | null;
  studentCount: number;
  status: string;
  grade?: { id: string; name: string; code: string } | null;
  school?: { id: string; name: string; shortName: string | null } | null;
  headTeacher?: { id: string; name: string; teacherNo: string } | null;
  [key: string]: unknown;
};

@Injectable()
export class ClassService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ClassQueryDto) {
    const where: {
      deletedAt: null;
      schoolId?: string;
      gradeId?: string;
      OR?: Array<{ name?: { contains: string }; code?: { contains: string } }>;
    } = { deletedAt: null };

    if (query.schoolId) where.schoolId = query.schoolId;
    if (query.gradeId) where.gradeId = query.gradeId;
    if (query.keyword) {
      where.OR = [
        { name: { contains: query.keyword } },
        { code: { contains: query.keyword } },
      ];
    }

    const [list, total] = await Promise.all([
      this.prisma.class.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: [{ gradeId: 'asc' }, { code: 'asc' }],
        include: {
          grade: { select: { id: true, name: true, code: true } },
          headTeacher: { select: { id: true, name: true, teacherNo: true } },
        },
      }),
      this.prisma.class.count({ where }),
    ]);

    const schoolIds = Array.from(
      new Set(list.map((c) => c.schoolId).filter((id): id is string => Boolean(id))),
    );
    const schools = schoolIds.length
      ? await this.prisma.school.findMany({
          where: { id: { in: schoolIds } },
          select: { id: true, name: true, shortName: true },
        })
      : [];
    const schoolMap = new Map(schools.map((s) => [s.id, s]));

    const listWithSchool: ClassWithSchool[] = list.map((c) => {
      const base = c as unknown as ClassWithSchool;
      return {
        ...base,
        school: c.schoolId ? (schoolMap.get(c.schoolId) ?? null) : null,
      };
    });

    return {
      list: listWithSchool,
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findOne(id: string) {
    const cls = await this.prisma.class.findUnique({
      where: { id, deletedAt: null },
      include: {
        grade: { select: { id: true, name: true, code: true } },
        headTeacher: { select: { id: true, name: true, teacherNo: true } },
        viceHeadTeacher: { select: { id: true, name: true, teacherNo: true } },
      },
    });

    if (!cls) {
      throw new NotFoundException('班级不存在');
    }

    let school: { id: string; name: string; shortName: string | null } | null = null;
    if (cls.schoolId) {
      school =
        (await this.prisma.school.findUnique({
          where: { id: cls.schoolId },
          select: { id: true, name: true, shortName: true },
        })) ?? null;
    }

    return { ...(cls as object), school };
  }
}
