-- ============================================================
-- SmartGrade Part A: 建表脚本（兼容微信云托管 MySQL/TDSQL）
-- ============================================================
-- 使用方法：
--   SQL 编辑器 → 选择 cloud1-d1govsdyt7996cf4e → 粘贴本文件 → 执行
--   执行成功后，再执行 Part B 种子数据脚本
--
-- 注意：如果表已存在，请先删除（DROP TABLE），或使用空数据库
-- ============================================================

-- ---------- DB-001 学校表 ----------
CREATE TABLE school (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  short_name VARCHAR(50),
  type ENUM('HIGH_SCHOOL','JUNIOR_HIGH','NINE_YEAR','COMPLETE') NOT NULL,
  province VARCHAR(50),
  city VARCHAR(50),
  district VARCHAR(50),
  address VARCHAR(255),
  principal_name VARCHAR(50),
  contact_phone VARCHAR(20),
  status ENUM('ACTIVE','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  INDEX (status),
  INDEX (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- DB-002 年级表 ----------
CREATE TABLE grade (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  school_id VARCHAR(36) NOT NULL,
  code VARCHAR(30) NOT NULL,
  name VARCHAR(50) NOT NULL,
  enrollment_year INT NOT NULL,
  graduation_year INT NOT NULL,
  stage ENUM('GRADE_10','GRADE_11','GRADE_12','GRADUATED') NOT NULL,
  director_id VARCHAR(36),
  status ENUM('ACTIVE','GRADUATED','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  UNIQUE KEY (school_id, code),
  INDEX (school_id, status),
  INDEX (director_id),
  FOREIGN KEY (school_id) REFERENCES school(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- DB-004 教师表 ----------
CREATE TABLE teacher (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  teacher_no VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(50) NOT NULL,
  gender ENUM('MALE','FEMALE','OTHER') NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(100),
  avatar VARCHAR(255),
  teaching_group VARCHAR(50),
  subject VARCHAR(50),
  position VARCHAR(50),
  status ENUM('ACTIVE','ON_LEAVE','RESIGNED') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  INDEX (status),
  INDEX (phone),
  INDEX (teaching_group)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- DB-003 班级表 ----------
CREATE TABLE class (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  grade_id VARCHAR(36) NOT NULL,
  school_id VARCHAR(36) NOT NULL,
  code VARCHAR(30) NOT NULL,
  name VARCHAR(50) NOT NULL,
  head_teacher_id VARCHAR(36),
  vice_head_teacher_id VARCHAR(36),
  student_count INT NOT NULL DEFAULT 0,
  status ENUM('ACTIVE','GRADUATED','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  UNIQUE KEY (grade_id, code),
  INDEX (school_id, grade_id, status),
  INDEX (head_teacher_id),
  FOREIGN KEY (grade_id) REFERENCES grade(id),
  FOREIGN KEY (head_teacher_id) REFERENCES teacher(id),
  FOREIGN KEY (vice_head_teacher_id) REFERENCES teacher(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- DB-006 家长表 ----------
CREATE TABLE parent (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  relation ENUM('FATHER','MOTHER','GRANDFATHER','GRANDMOTHER','GUARDIAN','OTHER') NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  wechat_openid VARCHAR(100) UNIQUE,
  wechat_unionid VARCHAR(100),
  email VARCHAR(100),
  avatar VARCHAR(255),
  status ENUM('ACTIVE','FROZEN') NOT NULL DEFAULT 'ACTIVE',
  notify_preference ENUM('ALL','IMPORTANT_ONLY','LEAVE_ONLY','NONE') NOT NULL DEFAULT 'ALL',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  INDEX (phone),
  INDEX (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- DB-010 宿舍楼 ----------
CREATE TABLE dorm_building (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  school_id VARCHAR(36) NOT NULL,
  name VARCHAR(50) NOT NULL,
  gender ENUM('MALE','FEMALE','OTHER') NOT NULL,
  floors INT NOT NULL DEFAULT 5,
  manager_id VARCHAR(36),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  INDEX (school_id),
  INDEX (manager_id),
  FOREIGN KEY (manager_id) REFERENCES teacher(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- DB-011 宿舍房间 ----------
CREATE TABLE dorm_room (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  building_id VARCHAR(36) NOT NULL,
  floor INT NOT NULL,
  room_no VARCHAR(20) NOT NULL,
  capacity INT NOT NULL DEFAULT 4,
  current_count INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  UNIQUE KEY (building_id, room_no),
  INDEX (building_id, floor),
  FOREIGN KEY (building_id) REFERENCES dorm_building(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- DB-005 学生表 ----------
CREATE TABLE student (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  student_no VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(50) NOT NULL,
  gender ENUM('MALE','FEMALE','OTHER') NOT NULL,
  class_id VARCHAR(36) NOT NULL,
  grade_id VARCHAR(36) NOT NULL,
  school_id VARCHAR(36) NOT NULL,
  boarding_type ENUM('BOARDING','DAY_STUDENT') NOT NULL,
  dorm_id VARCHAR(36),
  bed_no VARCHAR(20),
  current_status ENUM('ON_CAMPUS','OUT_OF_SCHOOL','GRADUATED','TRANSFERRED') NOT NULL DEFAULT 'ON_CAMPUS',
  current_location ENUM('CLASSROOM','DORM','PLAYGROUND','GATE','OFF_CAMPUS','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
  status_updated_at DATETIME,
  location_updated_at DATETIME,
  phone VARCHAR(20),
  enrolled_at DATETIME NOT NULL,
  graduated_at DATETIME,
  transferred_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  INDEX idx_student_status_location (school_id, grade_id, class_id, current_status, current_location),
  INDEX (school_id, current_status),
  INDEX (school_id, current_location),
  INDEX (class_id, current_status),
  INDEX (dorm_id, current_status),
  INDEX (boarding_type, current_status),
  INDEX (school_id, class_id, name),
  INDEX (student_no),
  FOREIGN KEY (class_id) REFERENCES class(id),
  FOREIGN KEY (dorm_id) REFERENCES dorm_room(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- DB-007 学生家长关联 ----------
CREATE TABLE student_parent (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  student_id VARCHAR(36) NOT NULL,
  parent_id VARCHAR(36) NOT NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY (student_id, parent_id),
  INDEX (parent_id),
  FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES parent(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- DB-008 用户表 ----------
CREATE TABLE user (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  username VARCHAR(50) UNIQUE,
  password_hash VARCHAR(255),
  user_type ENUM('SYSTEM_ADMIN','TEACHER','STUDENT','PARENT') NOT NULL,
  teacher_id VARCHAR(36) UNIQUE,
  student_id VARCHAR(36) UNIQUE,
  parent_id VARCHAR(36) UNIQUE,
  status ENUM('ACTIVE','FROZEN','LOCKED') NOT NULL DEFAULT 'ACTIVE',
  last_login_at DATETIME,
  last_login_ip VARCHAR(45),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  INDEX (user_type, status),
  FOREIGN KEY (teacher_id) REFERENCES teacher(id),
  FOREIGN KEY (parent_id) REFERENCES parent(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- DB-009 用户登录身份 ----------
CREATE TABLE user_identity (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  provider ENUM('PHONE','WECHAT','ACCOUNT') NOT NULL,
  external_id VARCHAR(200) NOT NULL,
  credential_hash VARCHAR(255),
  verified TINYINT(1) NOT NULL DEFAULT 0,
  verified_at DATETIME,
  status ENUM('ACTIVE','DISABLED') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  UNIQUE KEY (provider, external_id),
  INDEX (user_id),
  INDEX (provider, status),
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- DB-012 教师班级关联 ----------
CREATE TABLE teacher_class_relation (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  teacher_id VARCHAR(36) NOT NULL,
  class_id VARCHAR(36) NOT NULL,
  role ENUM('HEAD_TEACHER','SUBJECT_TEACHER','VICE_HEAD_TEACHER','COUNSELOR') NOT NULL,
  subject VARCHAR(50),
  start_date DATETIME NOT NULL,
  end_date DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_teacher_class_role_start (teacher_id, class_id, role, start_date),
  INDEX (class_id, role, end_date),
  INDEX (teacher_id, role, end_date),
  INDEX idx_tcr_period (class_id, role, start_date, end_date),
  FOREIGN KEY (teacher_id) REFERENCES teacher(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES class(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- DB-013 请假记录 ----------
CREATE TABLE leave_record (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  leave_no VARCHAR(30) NOT NULL UNIQUE,
  student_id VARCHAR(36) NOT NULL,
  student_name VARCHAR(50) NOT NULL,
  class_id VARCHAR(36) NOT NULL,
  class_name VARCHAR(50) NOT NULL,
  grade_id VARCHAR(36) NOT NULL,
  school_id VARCHAR(36) NOT NULL,
  leave_type ENUM('SICK','PERSONAL','OTHER') NOT NULL,
  leave_reason_type ENUM('ILLNESS','PERSONAL','FAMILY','SPORT','SCHOOL_ACTIVITY','OTHER') NOT NULL,
  reason TEXT NOT NULL,
  start_at DATETIME NOT NULL,
  end_at DATETIME NOT NULL,
  expected_return_time DATETIME,
  expected_return_note VARCHAR(255),
  actual_left_at DATETIME,
  actual_returned_at DATETIME,
  closed_at DATETIME,
  status ENUM('DRAFT','PENDING','APPROVED','REJECTED','CANCELLED','LEFT','RETURNED','CLOSED') NOT NULL DEFAULT 'DRAFT',
  applicant_id VARCHAR(36) NOT NULL,
  applicant_name VARCHAR(50) NOT NULL,
  approver_id VARCHAR(36),
  approver_name VARCHAR(50),
  approve_remark TEXT,
  approved_at DATETIME,
  reject_reason TEXT,
  rejected_at DATETIME,
  cancel_reason TEXT,
  return_judgment ENUM('ON_TIME','EARLY','DELAYED','NOT_SET'),
  attachment_ids TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  INDEX (student_id, status),
  INDEX (class_id, status, start_at),
  INDEX (grade_id, status, start_at),
  INDEX (school_id, status, start_at),
  INDEX (leave_reason_type, start_at),
  INDEX (start_at),
  INDEX (applicant_id),
  INDEX (approver_id),
  FOREIGN KEY (student_id) REFERENCES student(id),
  FOREIGN KEY (applicant_id) REFERENCES teacher(id),
  FOREIGN KEY (approver_id) REFERENCES teacher(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- DB-014 通知 ----------
CREATE TABLE notice (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  notice_no VARCHAR(30) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  content_format VARCHAR(20) NOT NULL DEFAULT 'PLAIN',
  notice_type ENUM('NOTICE','URGENT','MEETING','HOLIDAY','TEACHING') NOT NULL,
  targets TEXT,
  require_confirm TINYINT(1) NOT NULL DEFAULT 0,
  confirm_deadline DATETIME,
  publisher_id VARCHAR(36) NOT NULL,
  publisher_name VARCHAR(50) NOT NULL,
  status ENUM('DRAFT','PUBLISHED','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  published_at DATETIME,
  archived_at DATETIME,
  school_id VARCHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  INDEX (publisher_id),
  INDEX (school_id, status, published_at),
  INDEX (notice_type, status),
  FOREIGN KEY (publisher_id) REFERENCES teacher(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- DB-015 通知已读 ----------
CREATE TABLE notice_read (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  notice_id VARCHAR(36) NOT NULL,
  teacher_id VARCHAR(36) NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  read_at DATETIME,
  confirm_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY (notice_id, teacher_id),
  INDEX (teacher_id, is_read),
  INDEX (notice_id, is_read),
  FOREIGN KEY (notice_id) REFERENCES notice(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teacher(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- DB-016 任务 ----------
CREATE TABLE task (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  task_no VARCHAR(30) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  status ENUM('DRAFT','PENDING','IN_PROGRESS','COMPLETED','DEFERRED','CANCELLED','OVERDUE') NOT NULL DEFAULT 'PENDING',
  priority ENUM('URGENT','HIGH','NORMAL','LOW') NOT NULL DEFAULT 'NORMAL',
  source ENUM('GRADE_DIRECTOR','HEAD_TEACHER','SYSTEM_TEMPLATE','CROSS_DEPARTMENT','OTHER') NOT NULL,
  source_id VARCHAR(36),
  assignee_id VARCHAR(36) NOT NULL,
  assignee_name VARCHAR(50) NOT NULL,
  creator_id VARCHAR(36) NOT NULL,
  creator_name VARCHAR(50) NOT NULL,
  school_id VARCHAR(36) NOT NULL,
  due_at DATETIME NOT NULL,
  completed_at DATETIME,
  completion_remark TEXT,
  reminder_count INT NOT NULL DEFAULT 0,
  last_reminded_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  INDEX (assignee_id, status),
  INDEX (school_id, status, due_at),
  INDEX (creator_id, status),
  INDEX (source, source_id),
  INDEX (due_at),
  FOREIGN KEY (assignee_id) REFERENCES teacher(id),
  FOREIGN KEY (creator_id) REFERENCES teacher(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- DB-017 时间轴事件 ----------
CREATE TABLE timeline_event (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  event_type ENUM('LEAVE_CREATED','LEAVE_SUBMITTED','LEAVE_APPROVED','LEAVE_REJECTED','LEAVE_CANCELLED','LEAVE_GATE_LEFT','LEAVE_RETURNED','LEAVE_CLOSED','LEAVE_EDITED','LEAVE_RESUBMITTED','DORM_ABSENT','DORM_LATE','DORM_CHECKED_IN','NOTICE_SENT','NOTICE_READ','INCIDENT_RECORDED','INCIDENT_HANDLED','STUDENT_ENROLLED','STUDENT_GRADUATED','STUDENT_TRANSFERRED','STUDENT_STATUS_CHANGED') NOT NULL,
  event_source ENUM('LEAVE','DORM','NOTICE','INCIDENT','STUDENT') NOT NULL,
  source_event_id VARCHAR(100) NOT NULL,
  student_id VARCHAR(36) NOT NULL,
  operator_id VARCHAR(36),
  operator_name VARCHAR(50),
  operator_role VARCHAR(50),
  metadata TEXT,
  occurred_at DATETIME NOT NULL,
  recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  class_id VARCHAR(36),
  grade_id VARCHAR(36),
  school_id VARCHAR(36),
  leave_record_id VARCHAR(36),
  notice_id VARCHAR(36),
  related_type ENUM('LEAVE','NOTICE','TASK','DORM','INCIDENT','STUDENT'),
  related_id VARCHAR(100),
  is_system TINYINT(1) NOT NULL DEFAULT 0,
  UNIQUE KEY uniq_student_source_event (student_id, event_source, source_event_id),
  INDEX idx_student_time_desc (student_id, occurred_at),
  INDEX (student_id, event_type),
  INDEX (class_id, occurred_at),
  INDEX (grade_id, occurred_at),
  INDEX (school_id, occurred_at),
  INDEX (event_source, occurred_at),
  INDEX (event_type, occurred_at),
  INDEX (leave_record_id),
  INDEX (notice_id),
  INDEX idx_related (related_type, related_id),
  FOREIGN KEY (student_id) REFERENCES student(id),
  FOREIGN KEY (operator_id) REFERENCES teacher(id),
  FOREIGN KEY (leave_record_id) REFERENCES leave_record(id),
  FOREIGN KEY (notice_id) REFERENCES notice(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- DB-018 角色 ----------
CREATE TABLE role (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  role_code VARCHAR(50) NOT NULL UNIQUE,
  role_name VARCHAR(50) NOT NULL,
  description TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- DB-019 权限 ----------
CREATE TABLE permission (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  permission_code VARCHAR(50) NOT NULL UNIQUE,
  permission_name VARCHAR(50) NOT NULL,
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (resource, action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- DB-020 角色权限关联 ----------
CREATE TABLE role_permission (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  role_id BIGINT NOT NULL,
  permission_id BIGINT NOT NULL,
  UNIQUE KEY (role_id, permission_id),
  INDEX (permission_id),
  FOREIGN KEY (role_id) REFERENCES role(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permission(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- DB-021 标签 ----------
CREATE TABLE tag (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tag_code VARCHAR(50) NOT NULL UNIQUE,
  tag_name VARCHAR(50) NOT NULL,
  description TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Prisma 迁移记录表 ----------
CREATE TABLE _prisma_migrations (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  checksum VARCHAR(64) NOT NULL,
  finished_at DATETIME,
  migration_name VARCHAR(255) NOT NULL,
  logs TEXT,
  rolled_back_at DATETIME,
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  applied_steps_count INT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SELECT 'PART A 建表完成！共创建 21 张业务表 + 1 张迁移记录表' AS result;
