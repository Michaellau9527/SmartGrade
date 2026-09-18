-- ============================================================
-- SmartGrade 数据库初始化脚本 v1.2
-- ============================================================
-- 使用方法：
--   1. 进入微信云托管控制台 → SQL 型数据库 → SQL 编辑器
--   2. 选择数据库：cloud1-d1govsdyt7996cf4e
--   3. 粘贴本文件内容，点击执行
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 第一步：清空所有表（避免重复执行时报错）
-- ============================================================
DROP TABLE IF EXISTS `timeline_event`;
DROP TABLE IF EXISTS `task`;
DROP TABLE IF EXISTS `notice_read`;
DROP TABLE IF EXISTS `notice`;
DROP TABLE IF EXISTS `leave_record`;
DROP TABLE IF EXISTS `teacher_class_relation`;
DROP TABLE IF EXISTS `student_parent`;
DROP TABLE IF EXISTS `student`;
DROP TABLE IF EXISTS `dorm_room`;
DROP TABLE IF EXISTS `dorm_building`;
DROP TABLE IF EXISTS `parent`;
DROP TABLE IF EXISTS `user_identity`;
DROP TABLE IF EXISTS `user`;
DROP TABLE IF EXISTS `class`;
DROP TABLE IF EXISTS `grade`;
DROP TABLE IF EXISTS `teacher`;
DROP TABLE IF EXISTS `school`;
DROP TABLE IF EXISTS `role_permission`;
DROP TABLE IF EXISTS `permission`;
DROP TABLE IF EXISTS `role`;
DROP TABLE IF EXISTS `tag`;
DROP TABLE IF EXISTS `_prisma_migrations`;

-- ============================================================
-- 第二步：创建所有数据表（匹配 schema.prisma v1.2）
-- ============================================================

-- DB-001 School
CREATE TABLE `school` (
  `id` VARCHAR(36) NOT NULL,
  `code` VARCHAR(20) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `short_name` VARCHAR(50) NULL,
  `type` ENUM('HIGH_SCHOOL', 'JUNIOR_HIGH', 'NINE_YEAR', 'COMPLETE') NOT NULL,
  `province` VARCHAR(50) NULL,
  `city` VARCHAR(50) NULL,
  `district` VARCHAR(50) NULL,
  `address` VARCHAR(255) NULL,
  `principal_name` VARCHAR(50) NULL,
  `contact_phone` VARCHAR(20) NULL,
  `status` ENUM('ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `school_code_key` (`code`),
  INDEX `school_status_idx` (`status`),
  INDEX `school_type_idx` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DB-002 Grade
CREATE TABLE `grade` (
  `id` VARCHAR(36) NOT NULL,
  `school_id` VARCHAR(36) NOT NULL,
  `code` VARCHAR(30) NOT NULL,
  `name` VARCHAR(50) NOT NULL,
  `enrollment_year` INT NOT NULL,
  `graduation_year` INT NOT NULL,
  `stage` ENUM('GRADE_10', 'GRADE_11', 'GRADE_12', 'GRADUATED') NOT NULL,
  `director_id` VARCHAR(36) NULL,
  `status` ENUM('ACTIVE', 'GRADUATED', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `grade_school_id_code_key` (`school_id`, `code`),
  INDEX `grade_school_id_status_idx` (`school_id`, `status`),
  INDEX `grade_director_id_idx` (`director_id`),
  CONSTRAINT `grade_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `school` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DB-004 Teacher
CREATE TABLE `teacher` (
  `id` VARCHAR(36) NOT NULL,
  `teacher_no` VARCHAR(20) NOT NULL,
  `name` VARCHAR(50) NOT NULL,
  `gender` ENUM('MALE', 'FEMALE', 'OTHER') NOT NULL,
  `phone` VARCHAR(20) NULL,
  `email` VARCHAR(100) NULL,
  `avatar` VARCHAR(255) NULL,
  `teaching_group` VARCHAR(50) NULL,
  `subject` VARCHAR(50) NULL,
  `position` VARCHAR(50) NULL,
  `status` ENUM('ACTIVE', 'ON_LEAVE', 'RESIGNED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `teacher_teacher_no_key` (`teacher_no`),
  INDEX `teacher_status_idx` (`status`),
  INDEX `teacher_phone_idx` (`phone`),
  INDEX `teacher_teaching_group_idx` (`teaching_group`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DB-003 Class
CREATE TABLE `class` (
  `id` VARCHAR(36) NOT NULL,
  `grade_id` VARCHAR(36) NOT NULL,
  `school_id` VARCHAR(36) NOT NULL,
  `code` VARCHAR(30) NOT NULL,
  `name` VARCHAR(50) NOT NULL,
  `head_teacher_id` VARCHAR(36) NULL,
  `vice_head_teacher_id` VARCHAR(36) NULL,
  `student_count` INT NOT NULL DEFAULT 0,
  `status` ENUM('ACTIVE', 'GRADUATED', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `class_grade_id_code_key` (`grade_id`, `code`),
  INDEX `class_school_id_grade_id_status_idx` (`school_id`, `grade_id`, `status`),
  INDEX `class_head_teacher_id_idx` (`head_teacher_id`),
  CONSTRAINT `class_grade_id_fkey` FOREIGN KEY (`grade_id`) REFERENCES `grade` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `class_head_teacher_id_fkey` FOREIGN KEY (`head_teacher_id`) REFERENCES `teacher` (`id`) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `class_vice_head_teacher_id_fkey` FOREIGN KEY (`vice_head_teacher_id`) REFERENCES `teacher` (`id`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DB-006 Parent
CREATE TABLE `parent` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(50) NOT NULL,
  `relation` ENUM('FATHER', 'MOTHER', 'GRANDFATHER', 'GRANDMOTHER', 'GUARDIAN', 'OTHER') NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `wechat_openid` VARCHAR(100) NULL,
  `wechat_unionid` VARCHAR(100) NULL,
  `email` VARCHAR(100) NULL,
  `avatar` VARCHAR(255) NULL,
  `status` ENUM('ACTIVE', 'FROZEN') NOT NULL DEFAULT 'ACTIVE',
  `notify_preference` ENUM('ALL', 'IMPORTANT_ONLY', 'LEAVE_ONLY', 'NONE') NOT NULL DEFAULT 'ALL',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `parent_phone_key` (`phone`),
  UNIQUE KEY `parent_wechat_openid_key` (`wechat_openid`),
  INDEX `parent_phone_idx` (`phone`),
  INDEX `parent_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DB-010 DormBuilding
CREATE TABLE `dorm_building` (
  `id` VARCHAR(36) NOT NULL,
  `school_id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(50) NOT NULL,
  `gender` ENUM('MALE', 'FEMALE', 'OTHER') NOT NULL,
  `floors` INT NOT NULL DEFAULT 5,
  `manager_id` VARCHAR(36) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  INDEX `dorm_building_school_id_idx` (`school_id`),
  INDEX `dorm_building_manager_id_idx` (`manager_id`),
  CONSTRAINT `dorm_building_manager_id_fkey` FOREIGN KEY (`manager_id`) REFERENCES `teacher` (`id`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DB-011 DormRoom
CREATE TABLE `dorm_room` (
  `id` VARCHAR(36) NOT NULL,
  `building_id` VARCHAR(36) NOT NULL,
  `floor` INT NOT NULL,
  `room_no` VARCHAR(20) NOT NULL,
  `capacity` INT NOT NULL DEFAULT 4,
  `current_count` INT NOT NULL DEFAULT 0,
  `status` VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dorm_room_building_id_room_no_key` (`building_id`, `room_no`),
  INDEX `dorm_room_building_id_floor_idx` (`building_id`, `floor`),
  CONSTRAINT `dorm_room_building_id_fkey` FOREIGN KEY (`building_id`) REFERENCES `dorm_building` (`id`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DB-005 Student
CREATE TABLE `student` (
  `id` VARCHAR(36) NOT NULL,
  `student_no` VARCHAR(30) NOT NULL,
  `name` VARCHAR(50) NOT NULL,
  `gender` ENUM('MALE', 'FEMALE', 'OTHER') NOT NULL,
  `class_id` VARCHAR(36) NOT NULL,
  `grade_id` VARCHAR(36) NOT NULL,
  `school_id` VARCHAR(36) NOT NULL,
  `boarding_type` ENUM('BOARDING', 'DAY_STUDENT') NOT NULL,
  `dorm_id` VARCHAR(36) NULL,
  `bed_no` VARCHAR(20) NULL,
  `current_status` ENUM('ON_CAMPUS', 'OUT_OF_SCHOOL', 'GRADUATED', 'TRANSFERRED') NOT NULL DEFAULT 'ON_CAMPUS',
  `current_location` ENUM('CLASSROOM', 'DORM', 'PLAYGROUND', 'GATE', 'OFF_CAMPUS', 'UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
  `status_updated_at` DATETIME(3) NULL,
  `location_updated_at` DATETIME(3) NULL,
  `phone` VARCHAR(20) NULL,
  `enrolled_at` DATETIME(3) NOT NULL,
  `graduated_at` DATETIME(3) NULL,
  `transferred_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `student_student_no_key` (`student_no`),
  INDEX `idx_student_status_location` (`school_id`, `grade_id`, `class_id`, `current_status`, `current_location`),
  INDEX `student_school_id_current_status_idx` (`school_id`, `current_status`),
  INDEX `student_school_id_current_location_idx` (`school_id`, `current_location`),
  INDEX `student_class_id_current_status_idx` (`class_id`, `current_status`),
  INDEX `student_dorm_id_current_status_idx` (`dorm_id`, `current_status`),
  INDEX `student_boarding_type_current_status_idx` (`boarding_type`, `current_status`),
  INDEX `student_school_id_class_id_name_idx` (`school_id`, `class_id`, `name`),
  INDEX `student_student_no_idx` (`student_no`),
  CONSTRAINT `student_class_id_fkey` FOREIGN KEY (`class_id`) REFERENCES `class` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `student_dorm_id_fkey` FOREIGN KEY (`dorm_id`) REFERENCES `dorm_room` (`id`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DB-007 StudentParent
CREATE TABLE `student_parent` (
  `id` VARCHAR(36) NOT NULL,
  `student_id` VARCHAR(36) NOT NULL,
  `parent_id` VARCHAR(36) NOT NULL,
  `is_primary` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `student_parent_student_id_parent_id_key` (`student_id`, `parent_id`),
  INDEX `student_parent_parent_id_idx` (`parent_id`),
  CONSTRAINT `student_parent_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `student` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `student_parent_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `parent` (`id`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DB-008 User
CREATE TABLE `user` (
  `id` VARCHAR(36) NOT NULL,
  `username` VARCHAR(50) NULL,
  `password_hash` VARCHAR(255) NULL,
  `user_type` ENUM('SYSTEM_ADMIN', 'TEACHER', 'STUDENT', 'PARENT') NOT NULL,
  `teacher_id` VARCHAR(36) NULL,
  `student_id` VARCHAR(36) NULL,
  `parent_id` VARCHAR(36) NULL,
  `status` ENUM('ACTIVE', 'FROZEN', 'LOCKED') NOT NULL DEFAULT 'ACTIVE',
  `last_login_at` DATETIME(3) NULL,
  `last_login_ip` VARCHAR(45) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_username_key` (`username`),
  UNIQUE KEY `user_teacher_id_key` (`teacher_id`),
  UNIQUE KEY `user_student_id_key` (`student_id`),
  UNIQUE KEY `user_parent_id_key` (`parent_id`),
  INDEX `user_user_type_status_idx` (`user_type`, `status`),
  CONSTRAINT `user_teacher_id_fkey` FOREIGN KEY (`teacher_id`) REFERENCES `teacher` (`id`) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `user_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `parent` (`id`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DB-009 UserIdentity
CREATE TABLE `user_identity` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `provider` ENUM('PHONE', 'WECHAT', 'ACCOUNT') NOT NULL,
  `external_id` VARCHAR(200) NOT NULL,
  `credential_hash` VARCHAR(255) NULL,
  `verified` TINYINT(1) NOT NULL DEFAULT 0,
  `verified_at` DATETIME(3) NULL,
  `status` ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_identity_provider_external_id_key` (`provider`, `external_id`),
  INDEX `user_identity_user_id_idx` (`user_id`),
  INDEX `user_identity_provider_status_idx` (`provider`, `status`),
  CONSTRAINT `user_identity_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DB-012 TeacherClassRelation
CREATE TABLE `teacher_class_relation` (
  `id` VARCHAR(36) NOT NULL,
  `teacher_id` VARCHAR(36) NOT NULL,
  `class_id` VARCHAR(36) NOT NULL,
  `role` ENUM('HEAD_TEACHER', 'SUBJECT_TEACHER', 'VICE_HEAD_TEACHER', 'COUNSELOR') NOT NULL,
  `subject` VARCHAR(50) NULL,
  `start_date` DATETIME(3) NOT NULL,
  `end_date` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_teacher_class_role_start` (`teacher_id`, `class_id`, `role`, `start_date`),
  INDEX `teacher_class_relation_class_id_role_end_date_idx` (`class_id`, `role`, `end_date`),
  INDEX `teacher_class_relation_teacher_id_role_end_date_idx` (`teacher_id`, `role`, `end_date`),
  INDEX `idx_tcr_period` (`class_id`, `role`, `start_date`, `end_date`),
  CONSTRAINT `teacher_class_relation_teacher_id_fkey` FOREIGN KEY (`teacher_id`) REFERENCES `teacher` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `teacher_class_relation_class_id_fkey` FOREIGN KEY (`class_id`) REFERENCES `class` (`id`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DB-013 LeaveRecord
CREATE TABLE `leave_record` (
  `id` VARCHAR(36) NOT NULL,
  `leave_no` VARCHAR(30) NOT NULL,
  `student_id` VARCHAR(36) NOT NULL,
  `student_name` VARCHAR(50) NOT NULL,
  `class_id` VARCHAR(36) NOT NULL,
  `class_name` VARCHAR(50) NOT NULL,
  `grade_id` VARCHAR(36) NOT NULL,
  `school_id` VARCHAR(36) NOT NULL,
  `leave_type` ENUM('SICK', 'PERSONAL', 'OTHER') NOT NULL,
  `leave_reason_type` ENUM('ILLNESS', 'PERSONAL', 'FAMILY', 'SPORT', 'SCHOOL_ACTIVITY', 'OTHER') NOT NULL,
  `reason` TEXT NOT NULL,
  `start_at` DATETIME(3) NOT NULL,
  `end_at` DATETIME(3) NOT NULL,
  `expected_return_time` DATETIME(3) NULL,
  `expected_return_note` VARCHAR(255) NULL,
  `actual_left_at` DATETIME(3) NULL,
  `actual_returned_at` DATETIME(3) NULL,
  `closed_at` DATETIME(3) NULL,
  `status` ENUM('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'LEFT', 'RETURNED', 'CLOSED') NOT NULL DEFAULT 'DRAFT',
  `applicant_id` VARCHAR(36) NOT NULL,
  `applicant_name` VARCHAR(50) NOT NULL,
  `approver_id` VARCHAR(36) NULL,
  `approver_name` VARCHAR(50) NULL,
  `approve_remark` TEXT NULL,
  `approved_at` DATETIME(3) NULL,
  `reject_reason` TEXT NULL,
  `rejected_at` DATETIME(3) NULL,
  `cancel_reason` TEXT NULL,
  `return_judgment` ENUM('ON_TIME', 'EARLY', 'DELAYED', 'NOT_SET') NULL,
  `attachment_ids` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `leave_record_leave_no_key` (`leave_no`),
  INDEX `leave_record_student_id_status_idx` (`student_id`, `status`),
  INDEX `leave_record_class_id_status_start_at_idx` (`class_id`, `status`, `start_at`),
  INDEX `leave_record_grade_id_status_start_at_idx` (`grade_id`, `status`, `start_at`),
  INDEX `leave_record_school_id_status_start_at_idx` (`school_id`, `status`, `start_at`),
  INDEX `leave_record_leave_reason_type_start_at_idx` (`leave_reason_type`, `start_at`),
  INDEX `leave_record_start_at_idx` (`start_at`),
  INDEX `leave_record_applicant_id_idx` (`applicant_id`),
  INDEX `leave_record_approver_id_idx` (`approver_id`),
  CONSTRAINT `leave_record_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `student` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `leave_record_applicant_id_fkey` FOREIGN KEY (`applicant_id`) REFERENCES `teacher` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `leave_record_approver_id_fkey` FOREIGN KEY (`approver_id`) REFERENCES `teacher` (`id`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DB-014 Notice
CREATE TABLE `notice` (
  `id` VARCHAR(36) NOT NULL,
  `notice_no` VARCHAR(30) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `content` TEXT NOT NULL,
  `content_format` VARCHAR(20) NOT NULL DEFAULT 'PLAIN',
  `notice_type` ENUM('NOTICE', 'URGENT', 'MEETING', 'HOLIDAY', 'TEACHING') NOT NULL,
  `targets` JSON NULL,
  `require_confirm` TINYINT(1) NOT NULL DEFAULT 0,
  `confirm_deadline` DATETIME(3) NULL,
  `publisher_id` VARCHAR(36) NOT NULL,
  `publisher_name` VARCHAR(50) NOT NULL,
  `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `published_at` DATETIME(3) NULL,
  `archived_at` DATETIME(3) NULL,
  `school_id` VARCHAR(36) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `notice_notice_no_key` (`notice_no`),
  INDEX `notice_publisher_id_idx` (`publisher_id`),
  INDEX `notice_school_id_status_published_at_idx` (`school_id`, `status`, `published_at`),
  INDEX `notice_notice_type_status_idx` (`notice_type`, `status`),
  CONSTRAINT `notice_publisher_id_fkey` FOREIGN KEY (`publisher_id`) REFERENCES `teacher` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DB-015 NoticeRead
CREATE TABLE `notice_read` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `notice_id` VARCHAR(36) NOT NULL,
  `teacher_id` VARCHAR(36) NOT NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `read_at` DATETIME(3) NULL,
  `confirm_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `notice_read_notice_id_teacher_id_key` (`notice_id`, `teacher_id`),
  INDEX `notice_read_teacher_id_is_read_idx` (`teacher_id`, `is_read`),
  INDEX `notice_read_notice_id_is_read_idx` (`notice_id`, `is_read`),
  CONSTRAINT `notice_read_notice_id_fkey` FOREIGN KEY (`notice_id`) REFERENCES `notice` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `notice_read_teacher_id_fkey` FOREIGN KEY (`teacher_id`) REFERENCES `teacher` (`id`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DB-016 Task
CREATE TABLE `task` (
  `id` VARCHAR(36) NOT NULL,
  `task_no` VARCHAR(30) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `content` TEXT NULL,
  `status` ENUM('DRAFT', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'DEFERRED', 'CANCELLED', 'OVERDUE') NOT NULL DEFAULT 'PENDING',
  `priority` ENUM('URGENT', 'HIGH', 'NORMAL', 'LOW') NOT NULL DEFAULT 'NORMAL',
  `source` ENUM('GRADE_DIRECTOR', 'HEAD_TEACHER', 'SYSTEM_TEMPLATE', 'CROSS_DEPARTMENT', 'OTHER') NOT NULL,
  `source_id` VARCHAR(36) NULL,
  `assignee_id` VARCHAR(36) NOT NULL,
  `assignee_name` VARCHAR(50) NOT NULL,
  `creator_id` VARCHAR(36) NOT NULL,
  `creator_name` VARCHAR(50) NOT NULL,
  `school_id` VARCHAR(36) NOT NULL,
  `due_at` DATETIME(3) NOT NULL,
  `completed_at` DATETIME(3) NULL,
  `completion_remark` TEXT NULL,
  `reminder_count` INT NOT NULL DEFAULT 0,
  `last_reminded_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `task_task_no_key` (`task_no`),
  INDEX `task_assignee_id_status_idx` (`assignee_id`, `status`),
  INDEX `task_school_id_status_due_at_idx` (`school_id`, `status`, `due_at`),
  INDEX `task_creator_id_status_idx` (`creator_id`, `status`),
  INDEX `task_source_source_id_idx` (`source`, `source_id`),
  INDEX `task_due_at_idx` (`due_at`),
  CONSTRAINT `task_assignee_id_fkey` FOREIGN KEY (`assignee_id`) REFERENCES `teacher` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `task_creator_id_fkey` FOREIGN KEY (`creator_id`) REFERENCES `teacher` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DB-017 TimelineEvent
CREATE TABLE `timeline_event` (
  `id` VARCHAR(36) NOT NULL,
  `event_type` ENUM('LEAVE_CREATED', 'LEAVE_SUBMITTED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_CANCELLED', 'LEAVE_GATE_LEFT', 'LEAVE_RETURNED', 'LEAVE_CLOSED', 'LEAVE_EDITED', 'LEAVE_RESUBMITTED', 'DORM_ABSENT', 'DORM_LATE', 'DORM_CHECKED_IN', 'NOTICE_SENT', 'NOTICE_READ', 'INCIDENT_RECORDED', 'INCIDENT_HANDLED', 'STUDENT_ENROLLED', 'STUDENT_GRADUATED', 'STUDENT_TRANSFERRED', 'STUDENT_STATUS_CHANGED') NOT NULL,
  `event_source` ENUM('LEAVE', 'DORM', 'NOTICE', 'INCIDENT', 'STUDENT') NOT NULL,
  `source_event_id` VARCHAR(100) NOT NULL,
  `student_id` VARCHAR(36) NOT NULL,
  `operator_id` VARCHAR(36) NULL,
  `operator_name` VARCHAR(50) NULL,
  `operator_role` VARCHAR(50) NULL,
  `metadata` JSON NULL,
  `occurred_at` DATETIME(3) NOT NULL,
  `recorded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `class_id` VARCHAR(36) NULL,
  `grade_id` VARCHAR(36) NULL,
  `school_id` VARCHAR(36) NULL,
  `leave_record_id` VARCHAR(36) NULL,
  `notice_id` VARCHAR(36) NULL,
  `related_type` ENUM('LEAVE', 'NOTICE', 'TASK', 'DORM', 'INCIDENT', 'STUDENT') NULL,
  `related_id` VARCHAR(100) NULL,
  `is_system` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_student_source_event` (`student_id`, `event_source`, `source_event_id`),
  INDEX `idx_student_time_desc` (`student_id`, `occurred_at` DESC),
  INDEX `timeline_event_student_id_event_type_idx` (`student_id`, `event_type`),
  INDEX `timeline_event_class_id_occurred_at_idx` (`class_id`, `occurred_at` DESC),
  INDEX `timeline_event_grade_id_occurred_at_idx` (`grade_id`, `occurred_at` DESC),
  INDEX `timeline_event_school_id_occurred_at_idx` (`school_id`, `occurred_at` DESC),
  INDEX `timeline_event_event_source_occurred_at_idx` (`event_source`, `occurred_at` DESC),
  INDEX `timeline_event_event_type_occurred_at_idx` (`event_type`, `occurred_at` DESC),
  INDEX `timeline_event_leave_record_id_idx` (`leave_record_id`),
  INDEX `timeline_event_notice_id_idx` (`notice_id`),
  INDEX `idx_related` (`related_type`, `related_id`),
  CONSTRAINT `timeline_event_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `student` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `timeline_event_operator_id_fkey` FOREIGN KEY (`operator_id`) REFERENCES `teacher` (`id`) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `timeline_event_leave_record_id_fkey` FOREIGN KEY (`leave_record_id`) REFERENCES `leave_record` (`id`) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `timeline_event_notice_id_fkey` FOREIGN KEY (`notice_id`) REFERENCES `notice` (`id`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DB-018 Role
CREATE TABLE `role` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `role_code` VARCHAR(50) NOT NULL,
  `role_name` VARCHAR(50) NOT NULL,
  `description` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_role_code_key` (`role_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DB-019 Permission
CREATE TABLE `permission` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `permission_code` VARCHAR(50) NOT NULL,
  `permission_name` VARCHAR(50) NOT NULL,
  `resource` VARCHAR(50) NOT NULL,
  `action` VARCHAR(50) NOT NULL,
  `description` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `permission_permission_code_key` (`permission_code`),
  INDEX `permission_resource_action_idx` (`resource`, `action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DB-020 RolePermission
CREATE TABLE `role_permission` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `role_id` BIGINT NOT NULL,
  `permission_id` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_permission_role_id_permission_id_key` (`role_id`, `permission_id`),
  INDEX `role_permission_permission_id_idx` (`permission_id`),
  CONSTRAINT `role_permission_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `role` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `role_permission_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `permission` (`id`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DB-021 Tag
CREATE TABLE `tag` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `tag_code` VARCHAR(50) NOT NULL,
  `tag_name` VARCHAR(50) NOT NULL,
  `description` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `tag_tag_code_key` (`tag_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- _prisma_migrations（Prisma 迁移记录表）
CREATE TABLE `_prisma_migrations` (
  `id` VARCHAR(36) NOT NULL,
  `checksum` VARCHAR(64) NOT NULL,
  `finished_at` DATETIME(3) NULL,
  `migration_name` VARCHAR(255) NOT NULL,
  `logs` TEXT NULL,
  `rolled_back_at` DATETIME(3) NULL,
  `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `applied_steps_count` INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 第三步：插入种子数据（角色、权限、测试数据）
-- ============================================================

-- ---------- 1. 角色 ----------
INSERT INTO `role` (`role_code`, `role_name`, `description`) VALUES
('ROLE_ADMIN', '系统管理员', '拥有全部权限'),
('ROLE_GRADE_DIRECTOR', '年级主任', '查看本年级全部数据、发布通知、查看统计'),
('ROLE_POLITICAL', '政教', '审批请假、查看学生状态、处理异常'),
('ROLE_HEADMASTER', '班主任', '管理本班学生、发起请假、销假'),
('ROLE_DORM_MANAGER', '宿管', '查看住宿生、查寝、上报异常'),
('ROLE_SUBJECT_TEACHER', '任课教师', '查看通知、查看文件、查看个人待办');

-- ---------- 2. 权限 ----------
INSERT INTO `permission` (`permission_code`, `permission_name`, `resource`, `action`) VALUES
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
-- 生成时用变量会比较麻烦，这里用子查询插入
-- ROLE_GRADE_DIRECTOR
INSERT INTO `role_permission` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `role` r, `permission` p
WHERE r.role_code = 'ROLE_GRADE_DIRECTOR' AND p.permission_code IN (
  'notice:read', 'notice:create',
  'document:read',
  'todo:read', 'todo:complete',
  'student:read', 'student:timeline',
  'leave:read',
  'timeline:read',
  'statistics:read',
  'teacher:read'
);

-- ROLE_POLITICAL
INSERT INTO `role_permission` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `role` r, `permission` p
WHERE r.role_code = 'ROLE_POLITICAL' AND p.permission_code IN (
  'notice:read',
  'document:read',
  'todo:read', 'todo:complete',
  'student:read', 'student:timeline',
  'leave:read', 'leave:approve',
  'incident:read', 'incident:handle',
  'timeline:read',
  'statistics:read',
  'teacher:read'
);

-- ROLE_HEADMASTER
INSERT INTO `role_permission` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `role` r, `permission` p
WHERE r.role_code = 'ROLE_HEADMASTER' AND p.permission_code IN (
  'notice:read',
  'document:read',
  'todo:read', 'todo:complete',
  'student:read', 'student:timeline',
  'leave:read', 'leave:create', 'leave:finish',
  'timeline:read',
  'statistics:read'
);

-- ROLE_DORM_MANAGER
INSERT INTO `role_permission` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `role` r, `permission` p
WHERE r.role_code = 'ROLE_DORM_MANAGER' AND p.permission_code IN (
  'notice:read',
  'document:read',
  'todo:read', 'todo:complete',
  'dorm:read', 'dorm:check',
  'incident:create',
  'leave:read'
);

-- ROLE_SUBJECT_TEACHER
INSERT INTO `role_permission` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `role` r, `permission` p
WHERE r.role_code = 'ROLE_SUBJECT_TEACHER' AND p.permission_code IN (
  'notice:read',
  'document:read',
  'todo:read', 'todo:complete'
);

-- ---------- 4. 学校 + 年级 + 教师 + 班级（需要 cuid，用 UUID() 替代） ----------
-- 注意：MySQL 的 UUID() 生成的格式类似 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
-- Prisma 的 cuid() 生成的没有连字符但长度兼容，所以此处去掉连字符

-- 学校
SET @school_id = REPLACE(UUID(), '-', '');
INSERT INTO `school` (`id`, `code`, `name`, `short_name`, `type`, `province`, `city`, `district`, `address`)
VALUES (@school_id, 'SCH001', '智慧示范中学', '智慧中学', 'HIGH_SCHOOL', '广东省', '深圳市', '南山区', '科技园路 1 号');

-- 6 位教师 ID
SET @t001 = REPLACE(UUID(), '-', '');
SET @t002 = REPLACE(UUID(), '-', '');
SET @t003 = REPLACE(UUID(), '-', '');
SET @t004 = REPLACE(UUID(), '-', '');
SET @t005 = REPLACE(UUID(), '-', '');
SET @t006 = REPLACE(UUID(), '-', '');

-- 年级
SET @grade_id = REPLACE(UUID(), '-', '');
INSERT INTO `grade` (`id`, `school_id`, `code`, `name`, `enrollment_year`, `graduation_year`, `stage`, `director_id`)
VALUES (@grade_id, @school_id, 'G2024', '高一年级', 2024, 2027, 'GRADE_10', @t002);

-- 教师
INSERT INTO `teacher` (`id`, `teacher_no`, `name`, `gender`, `status`) VALUES
(@t001, 'T001', '管理员', 'MALE', 'ACTIVE'),
(@t002, 'T002', '张年级主任', 'MALE', 'ACTIVE'),
(@t003, 'T003', '李政教', 'MALE', 'ACTIVE'),
(@t004, 'T004', '王班主任', 'MALE', 'ACTIVE'),
(@t005, 'T005', '赵宿管', 'MALE', 'ACTIVE'),
(@t006, 'T006', '孙任课教师', 'FEMALE', 'ACTIVE');

-- 班级
SET @class_id = REPLACE(UUID(), '-', '');
INSERT INTO `class` (`id`, `grade_id`, `school_id`, `code`, `name`, `head_teacher_id`, `student_count`, `status`)
VALUES (@class_id, @grade_id, @school_id, 'C001', '高一（1）班', @t004, 5, 'ACTIVE');

-- 教师班级关联
SET @start_date = '2024-09-01 00:00:00.000';
INSERT INTO `teacher_class_relation` (`id`, `teacher_id`, `class_id`, `role`, `start_date`)
VALUES
(REPLACE(UUID(), '-', ''), @t004, @class_id, 'HEAD_TEACHER', @start_date),
(REPLACE(UUID(), '-', ''), @t006, @class_id, 'SUBJECT_TEACHER', @start_date);

-- ---------- 5. 宿舍楼 + 房间 ----------
SET @dorm_building_id = REPLACE(UUID(), '-', '');
INSERT INTO `dorm_building` (`id`, `school_id`, `name`, `gender`, `floors`, `manager_id`)
VALUES (@dorm_building_id, @school_id, '一号楼（男生）', 'MALE', 5, @t005);

SET @room101 = REPLACE(UUID(), '-', '');
SET @room102 = REPLACE(UUID(), '-', '');
INSERT INTO `dorm_room` (`id`, `building_id`, `floor`, `room_no`, `capacity`, `current_count`) VALUES
(@room101, @dorm_building_id, 1, '101', 4, 2),
(@room102, @dorm_building_id, 1, '102', 4, 1);

-- ---------- 6. 学生 ----------
SET @enrolled_at = '2024-09-01 00:00:00.000';

INSERT INTO `student` (`id`, `student_no`, `name`, `gender`, `class_id`, `grade_id`, `school_id`, `boarding_type`, `dorm_id`, `bed_no`, `enrolled_at`, `phone`) VALUES
(REPLACE(UUID(), '-', ''), 'S2024001', '张明', 'MALE', @class_id, @grade_id, @school_id, 'BOARDING', @room101, 'A01', @enrolled_at, '13800001001'),
(REPLACE(UUID(), '-', ''), 'S2024002', '李伟', 'MALE', @class_id, @grade_id, @school_id, 'BOARDING', @room101, 'A02', @enrolled_at, '13800001002'),
(REPLACE(UUID(), '-', ''), 'S2024003', '王芳', 'FEMALE', @class_id, @grade_id, @school_id, 'DAY_STUDENT', NULL, NULL, @enrolled_at, '13800001003'),
(REPLACE(UUID(), '-', ''), 'S2024004', '赵强', 'MALE', @class_id, @grade_id, @school_id, 'BOARDING', @room102, 'B01', @enrolled_at, '13800001004'),
(REPLACE(UUID(), '-', ''), 'S2024005', '刘洋', 'MALE', @class_id, @grade_id, @school_id, 'DAY_STUDENT', NULL, NULL, @enrolled_at, '13800001005');

-- ============================================================
-- 执行完成
-- ============================================================
SELECT 'SmartGrade 数据库初始化完成！共 21 张表 + 种子数据已插入' AS result;
SELECT '测试登录账号：T001 (管理员) / T002 (年级主任) / T003 (政教) / T004 (班主任) / T005 (宿管) / T006 (任课教师)' AS test_accounts;
