import { PrismaClient, Gender, BoardingType } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * SmartGrade 权限系统种子数据
 *
 * 初始化：
 * - 6 个系统角色 (docs/10-Permission.md 第四章)
 * - 32 个权限定义 (docs/10-Permission.md 权限矩阵)
 * - 角色权限关联 (docs/10-Permission.md 第十六章)
 * - 4 个测试教师账号
 * - 1 个年级 + 1 个班级 (测试数据)
 */

// ==================== 角色数据 ====================

const ROLES = [
  { role_code: 'ROLE_ADMIN', role_name: '系统管理员', description: '拥有全部权限' },
  { role_code: 'ROLE_GRADE_DIRECTOR', role_name: '年级主任', description: '查看本年级全部数据、发布通知、查看统计' },
  { role_code: 'ROLE_POLITICAL', role_name: '政教', description: '审批请假、查看学生状态、处理异常' },
  { role_code: 'ROLE_HEADMASTER', role_name: '班主任', description: '管理本班学生、发起请假、销假' },
  { role_code: 'ROLE_DORM_MANAGER', role_name: '宿管', description: '查看住宿生、查寝、上报异常' },
  { role_code: 'ROLE_SUBJECT_TEACHER', role_name: '任课教师', description: '查看通知、查看文件、查看个人待办' },
];

// ==================== 权限数据 ====================

const PERMISSIONS = [
  // 通知
  { permission_code: 'notice:read', permission_name: '查看通知', resource: 'notice', action: 'read' },
  { permission_code: 'notice:create', permission_name: '发布通知', resource: 'notice', action: 'create' },
  { permission_code: 'notice:update', permission_name: '修改通知', resource: 'notice', action: 'update' },
  { permission_code: 'notice:delete', permission_name: '删除通知', resource: 'notice', action: 'delete' },

  // 文件
  { permission_code: 'document:read', permission_name: '查看文件', resource: 'document', action: 'read' },
  { permission_code: 'document:create', permission_name: '上传文件', resource: 'document', action: 'create' },
  { permission_code: 'document:delete', permission_name: '删除文件', resource: 'document', action: 'delete' },

  // 待办
  { permission_code: 'todo:read', permission_name: '查看待办', resource: 'todo', action: 'read' },
  { permission_code: 'todo:complete', permission_name: '完成待办', resource: 'todo', action: 'complete' },

  // 学生
  { permission_code: 'student:read', permission_name: '查看学生', resource: 'student', action: 'read' },
  { permission_code: 'student:create', permission_name: '新增学生', resource: 'student', action: 'create' },
  { permission_code: 'student:update', permission_name: '修改学生', resource: 'student', action: 'update' },
  { permission_code: 'student:delete', permission_name: '删除学生', resource: 'student', action: 'delete' },
  { permission_code: 'student:timeline', permission_name: '查看学生时间轴', resource: 'student', action: 'timeline' },

  // 请假
  { permission_code: 'leave:read', permission_name: '查看请假', resource: 'leave', action: 'read' },
  { permission_code: 'leave:create', permission_name: '发起请假', resource: 'leave', action: 'create' },
  { permission_code: 'leave:approve', permission_name: '审批请假', resource: 'leave', action: 'approve' },
  { permission_code: 'leave:finish', permission_name: '销假', resource: 'leave', action: 'finish' },

  // 查寝
  { permission_code: 'dorm:read', permission_name: '查看宿舍', resource: 'dorm', action: 'read' },
  { permission_code: 'dorm:check', permission_name: '查寝', resource: 'dorm', action: 'check' },

  // 异常
  { permission_code: 'incident:read', permission_name: '查看异常', resource: 'incident', action: 'read' },
  { permission_code: 'incident:create', permission_name: '上报异常', resource: 'incident', action: 'create' },
  { permission_code: 'incident:handle', permission_name: '处理异常', resource: 'incident', action: 'handle' },

  // 时间轴
  { permission_code: 'timeline:read', permission_name: '查看时间轴', resource: 'timeline', action: 'read' },

  // 统计
  { permission_code: 'statistics:read', permission_name: '查看统计', resource: 'statistics', action: 'read' },

  // 教师
  { permission_code: 'teacher:read', permission_name: '查看教师', resource: 'teacher', action: 'read' },
  { permission_code: 'teacher:create', permission_name: '新增教师', resource: 'teacher', action: 'create' },
  { permission_code: 'teacher:update', permission_name: '修改教师', resource: 'teacher', action: 'update' },
  { permission_code: 'teacher:delete', permission_name: '删除教师', resource: 'teacher', action: 'delete' },
  { permission_code: 'teacher:assign-role', permission_name: '分配角色', resource: 'teacher', action: 'assign-role' },
  { permission_code: 'teacher:assign-tag', permission_name: '分配标签', resource: 'teacher', action: 'assign-tag' },

  // 角色/权限
  { permission_code: 'role:read', permission_name: '查看角色', resource: 'role', action: 'read' },
  { permission_code: 'role:create', permission_name: '新增角色', resource: 'role', action: 'create' },
  { permission_code: 'role:update', permission_name: '修改角色', resource: 'role', action: 'update' },
  { permission_code: 'role:delete', permission_name: '删除角色', resource: 'role', action: 'delete' },
  { permission_code: 'role:assign-permission', permission_name: '分配权限', resource: 'role', action: 'assign-permission' },

  // 系统配置
  { permission_code: 'config:read', permission_name: '查看配置', resource: 'config', action: 'read' },
  { permission_code: 'config:update', permission_name: '修改配置', resource: 'config', action: 'update' },
];

/**
 * 角色权限映射
 * 基于 docs/10-Permission.md 第十六章权限矩阵
 */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  ROLE_ADMIN: [], // 管理员拥有所有权限（Guard 层面跳过检查）
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

// ==================== 测试教师 ====================

const TEST_TEACHERS = [
  { teacher_no: 'T001', name: '管理员', gender: Gender.MALE, role: 'ROLE_ADMIN' },
  { teacher_no: 'T002', name: '张年级主任', gender: Gender.MALE, role: 'ROLE_GRADE_DIRECTOR' },
  { teacher_no: 'T003', name: '李政教', gender: Gender.MALE, role: 'ROLE_POLITICAL' },
  { teacher_no: 'T004', name: '王班主任', gender: Gender.MALE, role: 'ROLE_HEADMASTER' },
  { teacher_no: 'T005', name: '赵宿管', gender: Gender.MALE, role: 'ROLE_DORM_MANAGER' },
  { teacher_no: 'T006', name: '孙任课教师', gender: Gender.FEMALE, role: 'ROLE_SUBJECT_TEACHER' },
];

async function main() {
  console.log('🌱 开始 SmartGrade 权限系统种子数据初始化...\n');

  // 1. 创建角色
  console.log('📝 创建角色...');
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { role_code: role.role_code },
      update: { role_name: role.role_name, description: role.description },
      create: role,
    });
    console.log(`  ✅ ${role.role_code} - ${role.role_name}`);
  }

  // 2. 创建权限
  console.log('\n📝 创建权限...');
  const permMap: Map<string, number> = new Map();
  for (const perm of PERMISSIONS) {
    const created = await prisma.permission.upsert({
      where: { permission_code: perm.permission_code },
      update: { permission_name: perm.permission_name, resource: perm.resource, action: perm.action },
      create: perm,
    });
    permMap.set(created.permission_code, Number(created.id));
  }
  console.log(`  ✅ 共 ${PERMISSIONS.length} 个权限`);

  // 3. 创建角色权限关联
  console.log('\n📝 分配角色权限...');
  for (const [roleCode, permCodes] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.findUnique({ where: { role_code: roleCode } });

    if (!role) continue;

    // 清除旧关联
    await prisma.rolePermission.deleteMany({ where: { role_id: role.id } });

    // 创建新关联
    if (permCodes.length > 0) {
      const data = permCodes
        .map((code) => permMap.get(code))
        .filter((id) => id !== undefined)
        .map((permission_id) => ({
          role_id: role.id,
          permission_id,
        }));

      await prisma.rolePermission.createMany({ data });
    }
    console.log(`  ✅ ${roleCode}: ${permCodes.length > 0 ? permCodes.length : '全部(管理员)'} 个权限`);
  }

  // 4. 创建测试数据：年级 + 班级
  console.log('\n📝 创建测试年级和班级...');
  const grade = await prisma.grade.upsert({
    where: { grade_code: 'G2024' },
    update: {},
    create: { grade_name: '高一年级', grade_code: 'G2024' },
  });
  const cls = await prisma.class.upsert({
    where: { id: 1 },
    update: {},
    create: { grade_id: grade.id, class_name: '高一（1）班', student_count: 0 },
  });

  // 5. 创建测试教师
  console.log('\n📝 创建测试教师账号...');
  for (const t of TEST_TEACHERS) {
    const teacher = await prisma.teacher.upsert({
      where: { teacher_no: t.teacher_no },
      update: { name: t.name, gender: t.gender },
      create: {
        teacher_no: t.teacher_no,
        name: t.name,
        gender: t.gender,
        status: true,
      },
    });

    const role = await prisma.role.findUnique({ where: { role_code: t.role } });
    if (role) {
      await prisma.teacherRole.deleteMany({ where: { teacher_id: teacher.id } });
      await prisma.teacherRole.create({
        data: { teacher_id: teacher.id, role_id: role.id },
      });
    }

    // 班主任关联班级
    if (t.role === 'ROLE_HEADMASTER') {
      await prisma.class.update({
        where: { id: cls.id },
        data: { head_teacher_id: teacher.id },
      });
    }

    // 年级主任关联年级
    if (t.role === 'ROLE_GRADE_DIRECTOR') {
      await prisma.grade.update({
        where: { id: grade.id },
        data: { director_teacher_id: teacher.id },
      });
    }

    console.log(`  ✅ ${t.teacher_no} ${t.name} → ${t.role}`);
  }

  // 6. 创建测试宿舍数据
  console.log('\n📝 创建测试宿舍数据...');

  // 宿舍楼（男生楼）
  const dormitory = await prisma.dormitory.upsert({
    where: { id: 1 },
    update: {},
    create: {
      building_name: '一号楼（男生）',
      gender: Gender.MALE,
    },
  });
  console.log(`  ✅ 宿舍楼: ${dormitory.building_name}`);

  // 宿舍房间
  const room101 = await prisma.dormRoom.upsert({
    where: { id: 1 },
    update: {},
    create: {
      building_id: dormitory.id,
      room_no: '101',
      floor_no: 1,
      capacity: 4,
    },
  });
  const room102 = await prisma.dormRoom.upsert({
    where: { id: 2 },
    update: {},
    create: {
      building_id: dormitory.id,
      room_no: '102',
      floor_no: 1,
      capacity: 4,
    },
  });
  console.log(`  ✅ 房间: ${room101.room_no} (容量${room101.capacity}), ${room102.room_no} (容量${room102.capacity})`);

  // 7. 创建测试学生
  console.log('\n📝 创建测试学生...');
  const TEST_STUDENTS = [
    {
      student_no: 'S2024001',
      name: '张明',
      gender: Gender.MALE,
      boarding_type: BoardingType.BOARDING,
      dorm_room_id: room101.id,
      bed_no: 'A01',
      phone: '13800001001',
      parent_name: '张父',
      parent_phone: '13800002001',
    },
    {
      student_no: 'S2024002',
      name: '李伟',
      gender: Gender.MALE,
      boarding_type: BoardingType.BOARDING,
      dorm_room_id: room101.id,
      bed_no: 'A02',
      phone: '13800001002',
      parent_name: '李父',
      parent_phone: '13800002002',
    },
    {
      student_no: 'S2024003',
      name: '王芳',
      gender: Gender.FEMALE,
      boarding_type: BoardingType.DAY,
      dorm_room_id: null,
      bed_no: null,
      phone: '13800001003',
      parent_name: '王母',
      parent_phone: '13800002003',
    },
    {
      student_no: 'S2024004',
      name: '赵强',
      gender: Gender.MALE,
      boarding_type: BoardingType.BOARDING,
      dorm_room_id: room102.id,
      bed_no: 'B01',
      phone: '13800001004',
      parent_name: '赵父',
      parent_phone: '13800002004',
    },
    {
      student_no: 'S2024005',
      name: '刘洋',
      gender: Gender.MALE,
      boarding_type: BoardingType.DAY,
      dorm_room_id: null,
      bed_no: null,
      phone: '13800001005',
      parent_name: '刘母',
      parent_phone: '13800002005',
    },
  ];

  let boardingCount = 0;
  let dayCount = 0;
  for (const s of TEST_STUDENTS) {
    await prisma.student.upsert({
      where: { student_no: s.student_no },
      update: {
        name: s.name,
        gender: s.gender,
        class_id: cls.id,
        boarding_type: s.boarding_type,
        dorm_room_id: s.dorm_room_id,
        bed_no: s.bed_no,
        phone: s.phone,
        parent_name: s.parent_name,
        parent_phone: s.parent_phone,
      },
      create: {
        student_no: s.student_no,
        name: s.name,
        gender: s.gender,
        class_id: cls.id,
        boarding_type: s.boarding_type,
        dorm_room_id: s.dorm_room_id,
        bed_no: s.bed_no,
        phone: s.phone,
        parent_name: s.parent_name,
        parent_phone: s.parent_phone,
        status: 'IN_SCHOOL',
      },
    });

    if (s.boarding_type === BoardingType.BOARDING) {
      boardingCount++;
    } else {
      dayCount++;
    }
    console.log(`  ✅ ${s.student_no} ${s.name} (${s.gender}) ${s.boarding_type}${s.dorm_room_id ? ` 房间${s.dorm_room_id}/床${s.bed_no}` : ''}`);
  }

  // 更新班级学生人数
  await prisma.class.update({
    where: { id: cls.id },
    data: { student_count: TEST_STUDENTS.length },
  });

  console.log('\n✅ SmartGrade 权限系统种子数据初始化完成！');
  console.log('\n测试账号：');
  console.log('  T001 管理员     | 全部权限 + 数据范围 ALL');
  console.log('  T002 年级主任   | 年级管理 + 数据范围 GRADE');
  console.log('  T003 政教       | 请假审批 + 数据范围 ALL');
  console.log('  T004 班主任     | 请假/销假 + 数据范围 CLASS');
  console.log('  T005 宿管       | 查寝/异常 + 数据范围 DORM');
  console.log('  T006 任课教师   | 仅查看 + 数据范围 SELF');
  console.log('\n测试数据：');
  console.log(`  年级: 高一年级 (G2024)`);
  console.log(`  班级: 高一（1）班 (班主任: 王班主任)`);
  console.log(`  宿舍: 一号楼 101/102 (男生)`);
  console.log(`  学生: ${TEST_STUDENTS.length} 人 (住宿${boardingCount} + 走读${dayCount})`);
}

main()
  .catch((e) => {
    console.error('❌ 种子数据初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
