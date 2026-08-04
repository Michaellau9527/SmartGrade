import { PrismaClient, Gender, BoardingType, SchoolType, GradeStage, GradeStatus, ClassStatus, TeacherStatus, TeacherClassRole, UserType, UserStatus, IdentityProvider, IdentityStatus } from '@prisma/client';
import * as bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * SmartGrade 种子数据 v1.2（匹配 schema.prisma v1.2）
 *
 * 初始化：
 * - 学校 + 年级 + 班级
 * - 6 个系统角色 + 32 个权限 + 关联
 * - 默认管理员（admin / bcrypt 加密密码）+ 额外测试教师
 * - 宿舍楼 + 房间
 * - 5 个测试学生
 */

/**
 * 运行模式：
 *  SEED_MODE=full      -> 完整初始化（含测试学生/教师/组织数据），本地开发默认
 *  SEED_MODE=bootstrap -> 最小化生产初始化：仅角色权限 + 默认管理员账号
 *  未设置 SEED_MODE 时默认走 bootstrap 模式（生产安全默认值）
 */
const mode: 'full' | 'bootstrap' =
  process.env.SEED_MODE === 'full' ? 'full' : 'bootstrap';

/** 管理员默认账号（用户名） */
const ADMIN_USERNAME = process.env.SMARTGRADE_ADMIN_USERNAME || 'admin';
/**
 * 管理员默认密码：
 *  - 生产部署请务必显式设置 SMARTGRADE_ADMIN_PASSWORD 环境变量
 *  - 未设置时使用内建默认值（仅限首次初始化）
 */
const ADMIN_PASSWORD =
  process.env.SMARTGRADE_ADMIN_PASSWORD || 'SmartGrade@2025';
/** 管理员绑定的教师工号，用于小程序 teacherNo 登录 */
const ADMIN_TEACHER_NO =
  process.env.SMARTGRADE_ADMIN_TEACHER_NO || 'ADMIN';

async function seedRolesAndPermissions(adminRole: { id: bigint; roleCode: string }) {
  console.log('📝 创建角色...');

  const ROLES = [
    { roleCode: 'ROLE_ADMIN', roleName: '系统管理员', description: '拥有全部权限' },
    { roleCode: 'ROLE_GRADE_DIRECTOR', roleName: '年级主任', description: '查看本年级全部数据、发布通知、查看统计' },
    { roleCode: 'ROLE_POLITICAL', roleName: '政教', description: '审批请假、查看学生状态、处理异常' },
    { roleCode: 'ROLE_HEADMASTER', roleName: '班主任', description: '管理本班学生、发起请假、销假' },
    { roleCode: 'ROLE_DORM_MANAGER', roleName: '宿管', description: '查看住宿生、查寝、上报异常' },
    { roleCode: 'ROLE_SUBJECT_TEACHER', roleName: '任课教师', description: '查看通知、查看文件、查看个人待办' },
  ];

  const roleMap = new Map<string, bigint>();
  for (const r of ROLES) {
    const saved = await prisma.role.upsert({
      where: { roleCode: r.roleCode },
      update: { roleName: r.roleName, description: r.description },
      create: r,
    });
    roleMap.set(saved.roleCode, saved.id);
    console.log(`  ✅ ${r.roleCode} - ${r.roleName}`);
  }

  console.log('\n📝 创建权限...');
  const PERMISSIONS = [
    // 通知
    { permissionCode: 'notice:read', permissionName: '查看通知', resource: 'notice', action: 'read' },
    { permissionCode: 'notice:create', permissionName: '发布通知', resource: 'notice', action: 'create' },
    { permissionCode: 'notice:update', permissionName: '修改通知', resource: 'notice', action: 'update' },
    { permissionCode: 'notice:delete', permissionName: '删除通知', resource: 'notice', action: 'delete' },
    // 文件
    { permissionCode: 'document:read', permissionName: '查看文件', resource: 'document', action: 'read' },
    { permissionCode: 'document:create', permissionName: '上传文件', resource: 'document', action: 'create' },
    { permissionCode: 'document:delete', permissionName: '删除文件', resource: 'document', action: 'delete' },
    // 待办
    { permissionCode: 'todo:read', permissionName: '查看待办', resource: 'todo', action: 'read' },
    { permissionCode: 'todo:complete', permissionName: '完成待办', resource: 'todo', action: 'complete' },
    // 学生
    { permissionCode: 'student:read', permissionName: '查看学生', resource: 'student', action: 'read' },
    { permissionCode: 'student:create', permissionName: '新增学生', resource: 'student', action: 'create' },
    { permissionCode: 'student:update', permissionName: '修改学生', resource: 'student', action: 'update' },
    { permissionCode: 'student:delete', permissionName: '删除学生', resource: 'student', action: 'delete' },
    { permissionCode: 'student:timeline', permissionName: '查看学生时间轴', resource: 'student', action: 'timeline' },
    // 请假
    { permissionCode: 'leave:read', permissionName: '查看请假', resource: 'leave', action: 'read' },
    { permissionCode: 'leave:create', permissionName: '发起请假', resource: 'leave', action: 'create' },
    { permissionCode: 'leave:approve', permissionName: '审批请假', resource: 'leave', action: 'approve' },
    { permissionCode: 'leave:finish', permissionName: '销假', resource: 'leave', action: 'finish' },
    // 查寝
    { permissionCode: 'dorm:read', permissionName: '查看宿舍', resource: 'dorm', action: 'read' },
    { permissionCode: 'dorm:check', permissionName: '查寝', resource: 'dorm', action: 'check' },
    // 异常
    { permissionCode: 'incident:read', permissionName: '查看异常', resource: 'incident', action: 'read' },
    { permissionCode: 'incident:create', permissionName: '上报异常', resource: 'incident', action: 'create' },
    { permissionCode: 'incident:handle', permissionName: '处理异常', resource: 'incident', action: 'handle' },
    // 时间轴
    { permissionCode: 'timeline:read', permissionName: '查看时间轴', resource: 'timeline', action: 'read' },
    // 统计
    { permissionCode: 'statistics:read', permissionName: '查看统计', resource: 'statistics', action: 'read' },
    // 教师
    { permissionCode: 'teacher:read', permissionName: '查看教师', resource: 'teacher', action: 'read' },
    { permissionCode: 'teacher:create', permissionName: '新增教师', resource: 'teacher', action: 'create' },
    { permissionCode: 'teacher:update', permissionName: '修改教师', resource: 'teacher', action: 'update' },
    { permissionCode: 'teacher:delete', permissionName: '删除教师', resource: 'teacher', action: 'delete' },
    { permissionCode: 'teacher:assign-role', permissionName: '分配角色', resource: 'teacher', action: 'assign-role' },
    { permissionCode: 'teacher:assign-tag', permissionName: '分配标签', resource: 'teacher', action: 'assign-tag' },
    // 角色/权限
    { permissionCode: 'role:read', permissionName: '查看角色', resource: 'role', action: 'read' },
    { permissionCode: 'role:create', permissionName: '新增角色', resource: 'role', action: 'create' },
    { permissionCode: 'role:update', permissionName: '修改角色', resource: 'role', action: 'update' },
    { permissionCode: 'role:delete', permissionName: '删除角色', resource: 'role', action: 'delete' },
    { permissionCode: 'role:assign-permission', permissionName: '分配权限', resource: 'role', action: 'assign-permission' },
    // 系统配置
    { permissionCode: 'config:read', permissionName: '查看配置', resource: 'config', action: 'read' },
    { permissionCode: 'config:update', permissionName: '修改配置', resource: 'config', action: 'update' },
  ];

  const permMap = new Map<string, bigint>();
  for (const p of PERMISSIONS) {
    const created = await prisma.permission.upsert({
      where: { permissionCode: p.permissionCode },
      update: { permissionName: p.permissionName, resource: p.resource, action: p.action },
      create: p,
    });
    permMap.set(created.permissionCode, created.id);
  }
  console.log(`  ✅ 共 ${PERMISSIONS.length} 个权限`);

  console.log('\n📝 分配角色权限...');
  const ROLE_PERMISSIONS: Record<string, string[]> = {
    ROLE_ADMIN: [],
    ROLE_GRADE_DIRECTOR: [
      'notice:read', 'notice:create',
      'document:read',
      'todo:read', 'todo:complete',
      'student:read', 'student:timeline',
      'leave:read',
      'timeline:read',
      'statistics:read',
      'teacher:read',
    ],
    ROLE_POLITICAL: [
      'notice:read',
      'document:read',
      'todo:read', 'todo:complete',
      'student:read', 'student:timeline',
      'leave:read', 'leave:approve',
      'incident:read', 'incident:handle',
      'timeline:read',
      'statistics:read',
      'teacher:read',
    ],
    ROLE_HEADMASTER: [
      'notice:read',
      'document:read',
      'todo:read', 'todo:complete',
      'student:read', 'student:timeline',
      'leave:read', 'leave:create', 'leave:finish',
      'timeline:read',
      'statistics:read',
    ],
    ROLE_DORM_MANAGER: [
      'notice:read',
      'document:read',
      'todo:read', 'todo:complete',
      'dorm:read', 'dorm:check',
      'incident:create',
      'leave:read',
    ],
    ROLE_SUBJECT_TEACHER: [
      'notice:read',
      'document:read',
      'todo:read', 'todo:complete',
    ],
  };

  for (const [roleCode, permCodes] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = roleMap.get(roleCode);
    if (!roleId) continue;
    await prisma.rolePermission.deleteMany({ where: { roleId } });
    if (permCodes.length > 0) {
      const data = permCodes
        .map((c) => permMap.get(c))
        .filter((id): id is bigint => id !== undefined)
        .map((permissionId) => ({ roleId, permissionId }));
      await prisma.rolePermission.createMany({ data });
    }
    console.log(`  ✅ ${roleCode}: ${permCodes.length > 0 ? permCodes.length + ' 个权限' : '全部(管理员)'}`);
  }
}

/**
 * 创建默认管理员（ROLE_ADMIN）
 *  - Username: admin（可通过 SMARTGRADE_ADMIN_USERNAME 覆盖）
 *  - Password: 环境变量 SMARTGRADE_ADMIN_PASSWORD，默认 SmartGrade@2025
 *  - 同步创建 User / Teacher / UserIdentity 记录
 *  - 密码使用 bcrypt hash，不在数据库或 seed 代码中保存明文
 */
async function seedDefaultAdmin() {
  console.log('\n👤 初始化默认管理员账号...');

  const passwordHash = await bcryptjs.hash(ADMIN_PASSWORD, 10);
  const teacherNo = ADMIN_TEACHER_NO;

  // 1. 管理员对应 Teacher 记录（工号唯一）
  const teacher = await prisma.teacher.upsert({
    where: { teacherNo },
    update: { name: '系统管理员', gender: Gender.OTHER, status: TeacherStatus.ACTIVE },
    create: {
      teacherNo,
      name: '系统管理员',
      gender: Gender.OTHER,
      status: TeacherStatus.ACTIVE,
    },
  });

  // 2. 管理员 User 记录（username 唯一；关联 teacherId）
  const user = await prisma.user.upsert({
    where: { username: ADMIN_USERNAME },
    update: {
      passwordHash,
      userType: UserType.SYSTEM_ADMIN,
      teacherId: teacher.id,
      status: UserStatus.ACTIVE,
    },
    create: {
      username: ADMIN_USERNAME,
      passwordHash,
      userType: UserType.SYSTEM_ADMIN,
      teacherId: teacher.id,
      status: UserStatus.ACTIVE,
    },
  });

  // 3. ACCOUNT 登录身份（便于使用 username/password 登录方式调用 ACCOUNT provider）
  await prisma.userIdentity.upsert({
    where: { provider_externalId: { provider: IdentityProvider.ACCOUNT, externalId: ADMIN_USERNAME } },
    update: {
      userId: user.id,
      credentialHash: passwordHash,
      verified: true,
      status: IdentityStatus.ACTIVE,
    },
    create: {
      userId: user.id,
      provider: IdentityProvider.ACCOUNT,
      externalId: ADMIN_USERNAME,
      credentialHash: passwordHash,
      verified: true,
      status: IdentityStatus.ACTIVE,
    },
  });

  // 4. 记录工号兜底用的 ACCOUNT 身份（teacherNo）
  await prisma.userIdentity.upsert({
    where: { provider_externalId: { provider: IdentityProvider.ACCOUNT, externalId: teacherNo } },
    update: {
      userId: user.id,
      credentialHash: passwordHash,
      verified: true,
      status: IdentityStatus.ACTIVE,
    },
    create: {
      userId: user.id,
      provider: IdentityProvider.ACCOUNT,
      externalId: teacherNo,
      credentialHash: passwordHash,
      verified: true,
      status: IdentityStatus.ACTIVE,
    },
  });

  // 5. 管理员角色分配：直接写入 role_permission 不涉及，这里使用 teacher_role 的原生查询
  //    seed.ts 中用原生 upsert 替代 prisma 模型中缺失的 TeacherRole
  const adminRole = await prisma.role.findUnique({ where: { roleCode: 'ROLE_ADMIN' } });
  if (adminRole) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO teacher_role (teacher_id, role_id, created_at, updated_at)
      VALUES (?, ?, NOW(3), NOW(3))
      ON DUPLICATE KEY UPDATE updated_at = NOW(3)
    `, teacher.id, adminRole.id.toString());
  }

  console.log(`  ✅ Teacher  : ${teacherNo} / ${teacher.name}`);
  console.log(`  ✅ Username : ${ADMIN_USERNAME}`);
  console.log(`  ✅ Role     : ROLE_ADMIN (${adminRole ? 'assigned' : 'not found - skipped'})`);
  console.log(`  ✅ Password : bcrypt hash length=${passwordHash.length}`);
  console.log('');
  console.log('  ⚠️  生产环境请设置 SMARTGRADE_ADMIN_PASSWORD 环境变量覆盖默认密码');
}

async function main() {
  console.log('🌱 开始 SmartGrade 种子数据初始化...');
  console.log(`   Mode: ${mode}`);

  // 1. 角色 + 权限（全模式都执行）
  const adminRole = await prisma.role.findUnique({
    where: { roleCode: 'ROLE_ADMIN' },
    select: { id: true, roleCode: true },
  }) ?? { id: BigInt(0), roleCode: 'ROLE_ADMIN' };
  await seedRolesAndPermissions(adminRole);

  // 2. 默认管理员（全模式都执行，幂等 upsert）
  await seedDefaultAdmin();

  if (mode !== 'full') {
    console.log('\n🎉 SmartGrade 生产初始化完成（bootstrap 模式）');
    console.log(`  管理员账号: ${ADMIN_USERNAME} / teacherNo: ${ADMIN_TEACHER_NO}`);
    console.log('  提示: 设置 SEED_MODE=full 可初始化示例学校/学生/教师等测试数据');
    return;
  }

  // ==================== full 模式：示例组织 / 教师 / 学生数据 ====================

  // ==================== 1. 组织：学校 + 年级 + 班级 ====================
  const school = await prisma.school.upsert({
    where: { code: 'SCH001' },
    update: {},
    create: {
      code: 'SCH001',
      name: '智慧示范中学',
      shortName: '智慧中学',
      type: SchoolType.HIGH_SCHOOL,
      province: '广东省',
      city: '深圳市',
      district: '南山区',
      address: '科技园路 1 号',
    },
  });
  console.log(`  ✅ 学校: ${school.name} (${school.code})`);

  const grade = await prisma.grade.upsert({
    where: { schoolId_code: { schoolId: school.id, code: 'G2024' } },
    update: {},
    create: {
      schoolId: school.id,
      code: 'G2024',
      name: '高一年级',
      enrollmentYear: 2024,
      graduationYear: 2027,
      stage: GradeStage.GRADE_10,
      status: GradeStatus.ACTIVE,
    },
  });
  console.log(`  ✅ 年级: ${grade.name} (${grade.code})`);

  // ==================== 2. 测试教师 + 班级 ====================
  console.log('\n📝 创建测试教师账号 (T001~T006)...');

  const TEST_TEACHERS = [
    { teacherNo: 'T001', name: '管理员', gender: Gender.MALE, roleCode: 'ROLE_ADMIN' },
    { teacherNo: 'T002', name: '张年级主任', gender: Gender.MALE, roleCode: 'ROLE_GRADE_DIRECTOR' },
    { teacherNo: 'T003', name: '李政教', gender: Gender.MALE, roleCode: 'ROLE_POLITICAL' },
    { teacherNo: 'T004', name: '王班主任', gender: Gender.MALE, roleCode: 'ROLE_HEADMASTER' },
    { teacherNo: 'T005', name: '赵宿管', gender: Gender.MALE, roleCode: 'ROLE_DORM_MANAGER' },
    { teacherNo: 'T006', name: '孙任课教师', gender: Gender.FEMALE, roleCode: 'ROLE_SUBJECT_TEACHER' },
  ];

  const teacherMap = new Map<string, { id: string; roleCode: string }>();
  for (const t of TEST_TEACHERS) {
    const teacher = await prisma.teacher.upsert({
      where: { teacherNo: t.teacherNo },
      update: { name: t.name, gender: t.gender, status: TeacherStatus.ACTIVE },
      create: {
        teacherNo: t.teacherNo,
        name: t.name,
        gender: t.gender,
        status: TeacherStatus.ACTIVE,
      },
    });
    teacherMap.set(t.teacherNo, { id: teacher.id, roleCode: t.roleCode });
    console.log(`  ✅ ${t.teacherNo} ${t.name}`);
  }

  // 班级（关联班主任和年级主任）
  const cls = await prisma.class.upsert({
    where: { gradeId_code: { gradeId: grade.id, code: 'C001' } },
    update: {},
    create: {
      gradeId: grade.id,
      schoolId: school.id,
      code: 'C001',
      name: '高一（1）班',
      headTeacherId: teacherMap.get('T004')!.id,
      viceHeadTeacherId: null,
      studentCount: 0,
      status: ClassStatus.ACTIVE,
    },
  });
  console.log(`  ✅ 班级: ${cls.name} (${cls.code})`);

  // 更新年级主任
  await prisma.grade.update({
    where: { id: grade.id },
    data: { directorId: teacherMap.get('T002')!.id },
  });

  // 教师-班级关联
  console.log('\n📝 创建教师班级关联...');
  const headTeacher = teacherMap.get('T004')!;
  const subjectTeacher = teacherMap.get('T006')!;
  const dormManager = teacherMap.get('T005')!;

  const startDate = new Date('2024-09-01T00:00:00.000Z');

  await prisma.teacherClassRelation.upsert({
    where: {
      teacherId_classId_role_startDate: {
        teacherId: headTeacher.id,
        classId: cls.id,
        role: TeacherClassRole.HEAD_TEACHER,
        startDate,
      },
    },
    update: {},
    create: {
      teacherId: headTeacher.id,
      classId: cls.id,
      role: TeacherClassRole.HEAD_TEACHER,
      startDate,
    },
  });

  await prisma.teacherClassRelation.upsert({
    where: {
      teacherId_classId_role_startDate: {
        teacherId: subjectTeacher.id,
        classId: cls.id,
        role: TeacherClassRole.SUBJECT_TEACHER,
        startDate,
      },
    },
    update: {},
    create: {
      teacherId: subjectTeacher.id,
      classId: cls.id,
      role: TeacherClassRole.SUBJECT_TEACHER,
      subject: '数学',
      startDate,
    },
  });
  console.log(`  ✅ 班主任 + 任课教师关联完成`);

  // ==================== 4. 宿舍楼 + 房间 ====================
  console.log('\n📝 创建测试宿舍数据...');

  const dormBuilding = await prisma.dormBuilding.upsert({
    where: { id: (await prisma.dormBuilding.findFirst({ where: { name: '一号楼（男生）' } }))?.id || '__new__' },
    update: {},
    create: {
      schoolId: school.id,
      name: '一号楼（男生）',
      gender: Gender.MALE,
      floors: 5,
      managerId: dormManager.id,
    },
  });
  console.log(`  ✅ 宿舍楼: ${dormBuilding.name}`);

  const room101 = await prisma.dormRoom.upsert({
    where: { buildingId_roomNo: { buildingId: dormBuilding.id, roomNo: '101' } },
    update: {},
    create: {
      buildingId: dormBuilding.id,
      floor: 1,
      roomNo: '101',
      capacity: 4,
      currentCount: 0,
    },
  });

  const room102 = await prisma.dormRoom.upsert({
    where: { buildingId_roomNo: { buildingId: dormBuilding.id, roomNo: '102' } },
    update: {},
    create: {
      buildingId: dormBuilding.id,
      floor: 1,
      roomNo: '102',
      capacity: 4,
      currentCount: 0,
    },
  });
  console.log(`  ✅ 房间: ${room101.roomNo}, ${room102.roomNo}`);

  // ==================== 5. 学生 ====================
  console.log('\n📝 创建测试学生...');

  const enrolledAt = new Date('2024-09-01T00:00:00.000Z');

  const TEST_STUDENTS = [
    { studentNo: 'S2024001', name: '张明', gender: Gender.MALE, boardingType: BoardingType.BOARDING, dormId: room101.id, bedNo: 'A01', phone: '13800001001' },
    { studentNo: 'S2024002', name: '李伟', gender: Gender.MALE, boardingType: BoardingType.BOARDING, dormId: room101.id, bedNo: 'A02', phone: '13800001002' },
    { studentNo: 'S2024003', name: '王芳', gender: Gender.FEMALE, boardingType: BoardingType.DAY_STUDENT, dormId: null as any, bedNo: null as any, phone: '13800001003' },
    { studentNo: 'S2024004', name: '赵强', gender: Gender.MALE, boardingType: BoardingType.BOARDING, dormId: room102.id, bedNo: 'B01', phone: '13800001004' },
    { studentNo: 'S2024005', name: '刘洋', gender: Gender.MALE, boardingType: BoardingType.DAY_STUDENT, dormId: null as any, bedNo: null as any, phone: '13800001005' },
  ];

  for (const s of TEST_STUDENTS) {
    await prisma.student.upsert({
      where: { studentNo: s.studentNo },
      update: {
        name: s.name,
        gender: s.gender,
        classId: cls.id,
        gradeId: grade.id,
        schoolId: school.id,
        boardingType: s.boardingType,
        dormId: s.dormId,
        bedNo: s.bedNo,
        phone: s.phone,
      },
      create: {
        studentNo: s.studentNo,
        name: s.name,
        gender: s.gender,
        classId: cls.id,
        gradeId: grade.id,
        schoolId: school.id,
        boardingType: s.boardingType,
        dormId: s.dormId,
        bedNo: s.bedNo,
        phone: s.phone,
        enrolledAt,
      },
    });
    const typeLabel = s.boardingType === BoardingType.BOARDING ? '住宿' : '走读';
    console.log(`  ✅ ${s.studentNo} ${s.name} (${typeLabel})`);
  }

  // 更新班级人数
  await prisma.class.update({
    where: { id: cls.id },
    data: { studentCount: TEST_STUDENTS.length },
  });

  // 更新宿舍当前人数
  await prisma.dormRoom.update({
    where: { id: room101.id },
    data: { currentCount: 2 },
  });
  await prisma.dormRoom.update({
    where: { id: room102.id },
    data: { currentCount: 1 },
  });

  console.log('\n🎉 SmartGrade 种子数据初始化完成！');
  console.log('\n测试教师账号（登录用 teacherNo）：');
  console.log('  T001 管理员     | 全部权限');
  console.log('  T002 年级主任   | 年级管理');
  console.log('  T003 政教       | 请假审批');
  console.log('  T004 班主任     | 请假/销假');
  console.log('  T005 宿管       | 查寝/异常');
  console.log('  T006 任课教师   | 仅查看');
  console.log('\n测试数据：');
  console.log(`  学校: ${school.name}`);
  console.log(`  年级: ${grade.name} (主任: 张年级主任)`);
  console.log(`  班级: ${cls.name} (班主任: 王班主任, 学生${TEST_STUDENTS.length}人)`);
  console.log(`  宿舍: ${dormBuilding.name} 101(2人)/102(1人)`);
  console.log(`  学生: ${TEST_STUDENTS.length} 人 (住宿3 + 走读2)`);
}

main()
  .catch((e) => {
    console.error('❌ 种子数据初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
