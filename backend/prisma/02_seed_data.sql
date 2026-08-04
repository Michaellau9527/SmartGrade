-- ============================================================
-- SmartGrade Part B: 种子数据脚本
-- ============================================================
-- 使用方法：
--   先执行 01_create_tables.sql 建表
--   再执行本文件插入测试数据
-- ============================================================

-- ---------- 1. 角色 ----------
INSERT INTO role (role_code, role_name, description) VALUES
('ROLE_ADMIN', '系统管理员', '拥有全部权限'),
('ROLE_GRADE_DIRECTOR', '年级主任', '查看本年级全部数据、发布通知、查看统计'),
('ROLE_POLITICAL', '政教', '审批请假、查看学生状态、处理异常'),
('ROLE_HEADMASTER', '班主任', '管理本班学生、发起请假、销假'),
('ROLE_DORM_MANAGER', '宿管', '查看住宿生、查寝、上报异常'),
('ROLE_SUBJECT_TEACHER', '任课教师', '查看通知、查看文件、查看个人待办');

-- ---------- 2. 权限 ----------
INSERT INTO permission (permission_code, permission_name, resource, action) VALUES
('notice:read', '查看通知', 'notice', 'read'),
('notice:create', '发布通知', 'notice', 'create'),
('notice:update', '修改通知', 'notice', 'update'),
('notice:delete', '删除通知', 'notice', 'delete'),
('document:read', '查看文件', 'document', 'read'),
('document:create', '上传文件', 'document', 'create'),
('document:delete', '删除文件', 'document', 'delete'),
('todo:read', '查看待办', 'todo', 'read'),
('todo:complete', '完成待办', 'todo', 'complete'),
('student:read', '查看学生', 'student', 'read'),
('student:create', '新增学生', 'student', 'create'),
('student:update', '修改学生', 'student', 'update'),
('student:delete', '删除学生', 'student', 'delete'),
('student:timeline', '查看学生时间轴', 'student', 'timeline'),
('leave:read', '查看请假', 'leave', 'read'),
('leave:create', '发起请假', 'leave', 'create'),
('leave:approve', '审批请假', 'leave', 'approve'),
('leave:finish', '销假', 'leave', 'finish'),
('dorm:read', '查看宿舍', 'dorm', 'read'),
('dorm:check', '查寝', 'dorm', 'check'),
('incident:read', '查看异常', 'incident', 'read'),
('incident:create', '上报异常', 'incident', 'create'),
('incident:handle', '处理异常', 'incident', 'handle'),
('timeline:read', '查看时间轴', 'timeline', 'read'),
('statistics:read', '查看统计', 'statistics', 'read'),
('teacher:read', '查看教师', 'teacher', 'read'),
('teacher:create', '新增教师', 'teacher', 'create'),
('teacher:update', '修改教师', 'teacher', 'update'),
('teacher:delete', '删除教师', 'teacher', 'delete'),
('teacher:assign-role', '分配角色', 'teacher', 'assign-role'),
('teacher:assign-tag', '分配标签', 'teacher', 'assign-tag'),
('role:read', '查看角色', 'role', 'read'),
('role:create', '新增角色', 'role', 'create'),
('role:update', '修改角色', 'role', 'update'),
('role:delete', '删除角色', 'role', 'delete'),
('role:assign-permission', '分配权限', 'role', 'assign-permission'),
('config:read', '查看配置', 'config', 'read'),
('config:update', '修改配置', 'config', 'update');

-- ---------- 3. 角色权限关联 ----------
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.role_code = 'ROLE_GRADE_DIRECTOR' AND p.permission_code IN (
  'notice:read', 'notice:create', 'document:read', 'todo:read', 'todo:complete',
  'student:read', 'student:timeline', 'leave:read', 'timeline:read',
  'statistics:read', 'teacher:read'
);

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.role_code = 'ROLE_POLITICAL' AND p.permission_code IN (
  'notice:read', 'document:read', 'todo:read', 'todo:complete',
  'student:read', 'student:timeline', 'leave:read', 'leave:approve',
  'incident:read', 'incident:handle', 'timeline:read', 'statistics:read', 'teacher:read'
);

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.role_code = 'ROLE_HEADMASTER' AND p.permission_code IN (
  'notice:read', 'document:read', 'todo:read', 'todo:complete',
  'student:read', 'student:timeline', 'leave:read', 'leave:create', 'leave:finish',
  'timeline:read', 'statistics:read'
);

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.role_code = 'ROLE_DORM_MANAGER' AND p.permission_code IN (
  'notice:read', 'document:read', 'todo:read', 'todo:complete',
  'dorm:read', 'dorm:check', 'incident:create', 'leave:read'
);

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.role_code = 'ROLE_SUBJECT_TEACHER' AND p.permission_code IN (
  'notice:read', 'document:read', 'todo:read', 'todo:complete'
);

-- ---------- 4. 学校 ----------
SET @school_id = REPLACE(UUID(), '-', '');
INSERT INTO school (id, code, name, short_name, type, province, city, district, address)
VALUES (@school_id, 'SCH001', '智慧示范中学', '智慧中学', 'HIGH_SCHOOL', '广东省', '深圳市', '南山区', '科技园路 1 号');

-- ---------- 5. 教师 ----------
SET @t001 = REPLACE(UUID(), '-', '');
SET @t002 = REPLACE(UUID(), '-', '');
SET @t003 = REPLACE(UUID(), '-', '');
SET @t004 = REPLACE(UUID(), '-', '');
SET @t005 = REPLACE(UUID(), '-', '');
SET @t006 = REPLACE(UUID(), '-', '');

INSERT INTO teacher (id, teacher_no, name, gender, status) VALUES
(@t001, 'T001', '管理员', 'MALE', 'ACTIVE'),
(@t002, 'T002', '张年级主任', 'MALE', 'ACTIVE'),
(@t003, 'T003', '李政教', 'MALE', 'ACTIVE'),
(@t004, 'T004', '王班主任', 'MALE', 'ACTIVE'),
(@t005, 'T005', '赵宿管', 'MALE', 'ACTIVE'),
(@t006, 'T006', '孙任课教师', 'FEMALE', 'ACTIVE');

-- ---------- 6. 年级 ----------
SET @grade_id = REPLACE(UUID(), '-', '');
INSERT INTO grade (id, school_id, code, name, enrollment_year, graduation_year, stage, director_id)
VALUES (@grade_id, @school_id, 'G2024', '高一年级', 2024, 2027, 'GRADE_10', @t002);

-- ---------- 7. 班级 ----------
SET @class_id = REPLACE(UUID(), '-', '');
INSERT INTO class (id, grade_id, school_id, code, name, head_teacher_id, student_count, status)
VALUES (@class_id, @grade_id, @school_id, 'C001', '高一（1）班', @t004, 5, 'ACTIVE');

-- ---------- 8. 教师班级关联 ----------
INSERT INTO teacher_class_relation (id, teacher_id, class_id, role, start_date) VALUES
(REPLACE(UUID(), '-', ''), @t004, @class_id, 'HEAD_TEACHER', '2024-09-01 00:00:00'),
(REPLACE(UUID(), '-', ''), @t006, @class_id, 'SUBJECT_TEACHER', '2024-09-01 00:00:00');

-- ---------- 9. 宿舍 ----------
SET @dorm_building_id = REPLACE(UUID(), '-', '');
INSERT INTO dorm_building (id, school_id, name, gender, floors, manager_id)
VALUES (@dorm_building_id, @school_id, '一号楼（男生）', 'MALE', 5, @t005);

SET @room101 = REPLACE(UUID(), '-', '');
SET @room102 = REPLACE(UUID(), '-', '');
INSERT INTO dorm_room (id, building_id, floor, room_no, capacity, current_count) VALUES
(@room101, @dorm_building_id, 1, '101', 4, 2),
(@room102, @dorm_building_id, 1, '102', 4, 1);

-- ---------- 10. 学生 ----------
INSERT INTO student (id, student_no, name, gender, class_id, grade_id, school_id, boarding_type, dorm_id, bed_no, enrolled_at, phone) VALUES
(REPLACE(UUID(), '-', ''), 'S2024001', '张明', 'MALE', @class_id, @grade_id, @school_id, 'BOARDING', @room101, 'A01', '2024-09-01 00:00:00', '13800001001'),
(REPLACE(UUID(), '-', ''), 'S2024002', '李伟', 'MALE', @class_id, @grade_id, @school_id, 'BOARDING', @room101, 'A02', '2024-09-01 00:00:00', '13800001002'),
(REPLACE(UUID(), '-', ''), 'S2024003', '王芳', 'FEMALE', @class_id, @grade_id, @school_id, 'DAY_STUDENT', NULL, NULL, '2024-09-01 00:00:00', '13800001003'),
(REPLACE(UUID(), '-', ''), 'S2024004', '赵强', 'MALE', @class_id, @grade_id, @school_id, 'BOARDING', @room102, 'B01', '2024-09-01 00:00:00', '13800001004'),
(REPLACE(UUID(), '-', ''), 'S2024005', '刘洋', 'MALE', @class_id, @grade_id, @school_id, 'DAY_STUDENT', NULL, NULL, '2024-09-01 00:00:00', '13800001005');

SELECT 'PART B 种子数据插入完成！' AS result;
SELECT '测试账号：T001(管理员)/T002(年级主任)/T003(政教)/T004(班主任)/T005(宿管)/T006(任课教师)' AS test_accounts;
