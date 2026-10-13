-- ============================================================
-- SmartGrade RBAC 种子数据 v1.0
-- ============================================================
-- 解决问题：
--   体验者扫码登录后看到「权限不足:需要 student:read」
--   通知待办 / 查看更多 点击无响应
--   班主任无法手动添加本班学生
--
-- 根因链(2026-10-13 诊断):
--   1. `teacher_role` 表在 schema.prisma 中从未建模,P1-13 引入但 init_db.sql 没建表
--   2. `role` / `permission` / `role_permission` 表存在,但 seed.ts 的 INSERT 没跑过
--   3. JwtStrategy.loadTeacherRoles() 查 teacher_role 表 → 表不存在 → 异常吞掉
--      → 返回 roles=[] → user.permissions=[] → PermissionsGuard 一律拦截
--   4. 班主任缺 student:create / student:update / student:delete
--
-- 本脚本：
--   1. CREATE TABLE teacher_role (schema.prisma 没有,P1-13 漂移补救)
--   2. INSERT 8 个角色 + 39 个权限 (冒号格式,与 controller @RequirePermissions 对齐)
--   3. INSERT role_permission 关联 (从 role-permission.map.ts HEADMASTER_PERMS 同步)
--   4. INSERT teacher_role 关联 (体验者007→HEADMASTER, admin T001→ADMIN)
--
-- 执行方式:DMC (dms.tencent.com) → 数据库 → SQL 编辑器 → 整段粘贴 → 执行
-- 幂等:全部用 INSERT IGNORE,重复执行不会出错
-- 注意:此文件后续应并入 init_db.sql (P2 任务)
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 第一步:建 teacher_role 表 (schema.prisma 没有,代码依赖)
-- ============================================================
CREATE TABLE IF NOT EXISTS `teacher_role` (
  `id`          BIGINT AUTO_INCREMENT NOT NULL,
  `teacher_id`  VARCHAR(36) NOT NULL COMMENT '关联 teacher.id',
  `role_id`     BIGINT NOT NULL COMMENT '关联 role.id',
  `created_at`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `teacher_role_teacher_id_role_id_key` (`teacher_id`, `role_id`),
  KEY `teacher_role_role_id_idx` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='教师-角色关联 (P1-13 schema drift 补救)';

-- ============================================================
-- 第二步:插 8 个角色 (跟 RoleCode enum 对齐)
-- ============================================================
INSERT IGNORE INTO `role` (`role_code`, `role_name`, `description`) VALUES
('ROLE_ADMIN',          '系统管理员', '拥有全校数据查看、所有操作权限'),
('ROLE_GRADE_DIRECTOR', '年级主任',   '查看本年级全部数据、发布通知、查看统计'),
('ROLE_POLITICAL',      '政教',       '审批请假、查看学生状态、处理异常'),
('ROLE_HEADMASTER',     '班主任',     '管理本班学生、发起请假、查寝、上报异常、查看统计'),
('ROLE_SUBJECT_TEACHER','任课教师',   '查看通知、查看文件、查看个人待办'),
('ROLE_DORM_MANAGER',   '宿管',       '查看住宿生、查寝、上报异常'),
('ROLE_PARENT',         '家长',       '查看通知、查看个人资料'),
('ROLE_STUDENT',        '学生',       '查看通知、查看个人资料');

-- ============================================================
-- 第三步:插 39 个权限 (全部冒号格式,与 @RequirePermissions 装饰器对齐)
-- ============================================================
INSERT IGNORE INTO `permission` (`permission_code`, `permission_name`, `resource`, `action`) VALUES
('workbench:view',           '查看工作台',         'workbench', 'view'),
('notice:read',              '查看通知',           'notice',    'read'),
('notice:create',            '发布通知',           'notice',    'create'),
('notice:update',            '修改通知',           'notice',    'update'),
('notice:delete',            '删除通知',           'notice',    'delete'),
('document:read',            '查看文件',           'document',  'read'),
('document:create',          '上传文件',           'document',  'create'),
('document:delete',          '删除文件',           'document',  'delete'),
('todo:read',                '查看待办',           'todo',      'read'),
('todo:complete',            '完成待办',           'todo',      'complete'),
('task:assign',              '分配任务',           'task',      'assign'),
('task:delete',              '删除任务',           'task',      'delete'),
('student:read',             '查看学生',           'student',   'read'),
('student:create',           '新增学生',           'student',   'create'),
('student:update',           '修改学生',           'student',   'update'),
('student:delete',           '删除学生',           'student',   'delete'),
('student:timeline',         '查看学生时间轴',     'student',   'timeline'),
('leave:read',               '查看请假',           'leave',     'read'),
('leave:create',             '发起请假',           'leave',     'create'),
('leave:update',             '修改请假',           'leave',     'update'),
('leave:approve',            '审批请假',           'leave',     'approve'),
('leave:close',              '销假',               'leave',     'close'),
('leave:cancel',             '取消请假',           'leave',     'cancel'),
('dorm:read',                '查看宿舍',           'dorm',      'read'),
('dorm:check',               '查寝',               'dorm',      'check'),
('incident:read',            '查看异常',           'incident',  'read'),
('incident:create',          '上报异常',           'incident',  'create'),
('incident:handle',          '处理异常',           'incident',  'handle'),
('incident:close',           '关闭异常',           'incident',  'close'),
('timeline:read',            '查看时间轴',         'timeline',  'read'),
('statistics:read',          '查看统计',           'statistics','read'),
('teacher:read',             '查看教师',           'teacher',   'read'),
('teacher:create',           '新增教师',           'teacher',   'create'),
('teacher:update',           '修改教师',           'teacher',   'update'),
('teacher:delete',           '删除教师',           'teacher',   'delete'),
('teacher:bind-wechat',      '绑定教师微信',       'teacher',   'bind-wechat'),
('teacher:unbind-wechat',    '解绑教师微信',       'teacher',   'unbind-wechat'),
('system:admin',             '系统管理',           'system',    'admin'),
('user:profile:read',        '查看个人资料',       'user',      'profile:read'),
('user:profile:update',      '修改个人资料',       'user',      'profile:update');

-- ============================================================
-- 第四步:role_permission 关联 (从 role-permission.map.ts 同步)
-- 包含:班主任新增的 student:create / update / delete
-- ============================================================

-- 系统管理员
INSERT IGNORE INTO `role_permission` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `role` r, `permission` p
WHERE r.role_code = 'ROLE_ADMIN'
  AND p.permission_code IN (
    'workbench:view',
    'notice:read','notice:create','notice:update','notice:delete',
    'document:read','document:create','document:delete',
    'todo:read','todo:complete','task:assign','task:delete',
    'student:read',
    'leave:read','leave:create','leave:update','leave:approve','leave:close','leave:cancel',
    'dorm:read','dorm:check',
    'incident:read','incident:create','incident:handle','incident:close',
    'timeline:read','statistics:read',
    'teacher:read','teacher:create','teacher:update','teacher:delete',
    'teacher:bind-wechat','teacher:unbind-wechat',
    'user:profile:read','user:profile:update',
    'system:admin'
  );

-- 年级主任
INSERT IGNORE INTO `role_permission` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `role` r, `permission` p
WHERE r.role_code = 'ROLE_GRADE_DIRECTOR'
  AND p.permission_code IN (
    'workbench:view',
    'notice:read','notice:create',
    'document:read','document:create',
    'todo:read','task:assign',
    'student:read',
    'leave:read',
    'incident:read','dorm:read','statistics:read',
    'teacher:read',
    'user:profile:read','user:profile:update'
  );

-- 政教
INSERT IGNORE INTO `role_permission` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `role` r, `permission` p
WHERE r.role_code = 'ROLE_POLITICAL'
  AND p.permission_code IN (
    'workbench:view','notice:read','document:read',
    'todo:read','student:read',
    'leave:read','leave:approve',
    'incident:read','incident:create','incident:handle',
    'dorm:read','statistics:read','teacher:read',
    'user:profile:read','user:profile:update'
  );

-- 班主任 (含新增的 student:create/update/delete)
INSERT IGNORE INTO `role_permission` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `role` r, `permission` p
WHERE r.role_code = 'ROLE_HEADMASTER'
  AND p.permission_code IN (
    'workbench:view','notice:read','document:read',
    'todo:read','todo:complete',
    'student:read','student:create','student:update','student:delete','student:timeline',
    'leave:create','leave:read','leave:update','leave:close','leave:cancel',
    'incident:read',
    'dorm:read',
    'statistics:read',
    'user:profile:read','user:profile:update'
  );

-- 任课教师
INSERT IGNORE INTO `role_permission` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `role` r, `permission` p
WHERE r.role_code = 'ROLE_SUBJECT_TEACHER'
  AND p.permission_code IN (
    'workbench:view','notice:read','document:read',
    'todo:read','todo:complete',
    'user:profile:read','user:profile:update'
  );

-- 宿管
INSERT IGNORE INTO `role_permission` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `role` r, `permission` p
WHERE r.role_code = 'ROLE_DORM_MANAGER'
  AND p.permission_code IN (
    'workbench:view','notice:read','document:read',
    'todo:read','todo:complete',
    'student:read',
    'leave:read',
    'incident:read','incident:create',
    'dorm:read','dorm:check',
    'user:profile:read','user:profile:update'
  );

-- 家长
INSERT IGNORE INTO `role_permission` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `role` r, `permission` p
WHERE r.role_code = 'ROLE_PARENT'
  AND p.permission_code IN (
    'workbench:view','notice:read','leave:read',
    'user:profile:read','user:profile:update'
  );

-- 学生
INSERT IGNORE INTO `role_permission` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `role` r, `permission` p
WHERE r.role_code = 'ROLE_STUDENT'
  AND p.permission_code IN (
    'workbench:view','notice:read','leave:read',
    'user:profile:read','user:profile:update'
  );

-- ============================================================
-- 第五步:teacher_role 关联 (体验者绑定)
-- ============================================================
-- 体验者 刘忠昊 (teacher_no='007') → ROLE_HEADMASTER
INSERT IGNORE INTO `teacher_role` (`teacher_id`, `role_id`)
SELECT t.id, r.id
FROM `teacher` t, `role` r
WHERE t.teacher_no = '007' AND r.role_code = 'ROLE_HEADMASTER';

-- 后台管理员 (teacher_no='T001') → ROLE_ADMIN
INSERT IGNORE INTO `teacher_role` (`teacher_id`, `role_id`)
SELECT t.id, r.id
FROM `teacher` t, `role` r
WHERE t.teacher_no = 'T001' AND r.role_code = 'ROLE_ADMIN';

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 第六步:验证
-- ============================================================
SELECT '=== 1. 角色统计 ===' AS '';
SELECT role_code, role_name,
  (SELECT COUNT(*) FROM role_permission WHERE role_id = r.id) AS permission_count
FROM role r
ORDER BY id;

SELECT '=== 2. 体验者(007)和 admin(T001) 的角色绑定 ===' AS '';
SELECT t.teacher_no, t.name, GROUP_CONCAT(r.role_code) AS roles
FROM teacher t
LEFT JOIN teacher_role tr ON tr.teacher_id = t.id
LEFT JOIN role r ON r.id = tr.role_id
WHERE t.teacher_no IN ('007','T001')
GROUP BY t.teacher_no, t.name;

SELECT '=== 3. 体验者(007)的权限数 ===' AS '';
SELECT COUNT(DISTINCT p.permission_code) AS perm_count
FROM teacher t
JOIN teacher_role tr ON tr.teacher_id = t.id
JOIN role_permission rp ON rp.role_id = tr.role_id
JOIN permission p ON p.id = rp.permission_id
WHERE t.teacher_no = '007';

SELECT '=== 4. 体验者(007)的核心权限清单 ===' AS '';
SELECT p.permission_code
FROM teacher t
JOIN teacher_role tr ON tr.teacher_id = t.id
JOIN role_permission rp ON rp.role_id = tr.role_id
JOIN permission p ON p.id = rp.permission_id
WHERE t.teacher_no = '007'
ORDER BY p.permission_code;

SELECT '✅ RBAC seed 完成!体验者 007 已具备 student:read/create/update/delete 等班主任权限' AS done;
