-- Prisma baseline migration for SmartGrade schema v1.2
-- MySQL 8.0+ · utf8mb4_unicode_ci
-- This file matches exactly what schema.prisma declares and is used by
-- `prisma migrate deploy` for fresh database bootstrap on CloudBase.

-- =====================================================================
-- 28 Enums (MySQL: represented as VARCHAR with CHECK or ENUM per column)
-- =====================================================================
-- Note: Prisma's MySQL connector maps enums to VARCHAR + inline
-- constraint. We rely on Prisma to validate values at the client;
-- the schema below uses VARCHAR(32/64) so that baseline is idempotent.

-- =====================================================================
-- Step 1: Basic models — Organization & Identity Layer (8 tables)
-- =====================================================================

-- DB-001 School
CREATE TABLE IF NOT EXISTS `school` (
  `id`                VARCHAR(30) NOT NULL,
  `code`              VARCHAR(20) NOT NULL,
  `name`              VARCHAR(100) NOT NULL,
  `short_name`        VARCHAR(50) NULL,
  `type`              VARCHAR(32) NOT NULL,
  `province`          VARCHAR(50) NULL,
  `city`              VARCHAR(50) NULL,
  `district`          VARCHAR(50) NULL,
  `address`           VARCHAR(255) NULL,
  `principal_name`    VARCHAR(50) NULL,
  `contact_phone`     VARCHAR(20) NULL,
  `status`            VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  `created_at`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at`        DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `school_code_key` (`code`),
  KEY `school_status_idx` (`status`),
  KEY `school_type_idx` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DB-002 Grade
CREATE TABLE IF NOT EXISTS `grade` (
  `id`                VARCHAR(30) NOT NULL,
  `school_id`         VARCHAR(30) NOT NULL,
  `code`              VARCHAR(30) NOT NULL,
  `name`              VARCHAR(50) NOT NULL,
  `enrollment_year`   INT NOT NULL,
  `graduation_year`   INT NOT NULL,
  `stage`             VARCHAR(32) NOT NULL,
  `director_id`       VARCHAR(30) NULL,
  `status`            VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  `created_at`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at`        DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `grade_school_id_code_key` (`school_id`,`code`),
  KEY `grade_school_id_status_idx` (`school_id`,`status`),
  KEY `grade_director_id_idx` (`director_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DB-003 Class
CREATE TABLE IF NOT EXISTS `class` (
  `id`                    VARCHAR(30) NOT NULL,
  `grade_id`              VARCHAR(30) NOT NULL,
  `school_id`             VARCHAR(30) NOT NULL,
  `code`                  VARCHAR(30) NOT NULL,
  `name`                  VARCHAR(50) NOT NULL,
  `head_teacher_id`       VARCHAR(30) NULL,
  `vice_head_teacher_id`  VARCHAR(30) NULL,
  `student_count`         INT NOT NULL DEFAULT 0,
  `status`                VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  `created_at`            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at`            DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `class_grade_id_code_key` (`grade_id`,`code`),
  KEY `class_school_id_grade_id_status_idx` (`school_id`,`grade_id`,`status`),
  KEY `class_head_teacher_id_idx` (`head_teacher_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DB-004 Teacher
CREATE TABLE IF NOT EXISTS `teacher` (
  `id`                VARCHAR(30) NOT NULL,
  `teacher_no`        VARCHAR(20) NOT NULL,
  `name`              VARCHAR(50) NOT NULL,
  `gender`            VARCHAR(16) NOT NULL,
  `phone`             VARCHAR(20) NULL,
  `email`             VARCHAR(100) NULL,
  `avatar`            VARCHAR(255) NULL,
  `teaching_group`    VARCHAR(50) NULL,
  `subject`           VARCHAR(50) NULL,
  `position`          VARCHAR(50) NULL,
  `status`            VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  `created_at`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at`        DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `teacher_teacher_no_key` (`teacher_no`),
  KEY `teacher_status_idx` (`status`),
  KEY `teacher_phone_idx` (`phone`),
  KEY `teacher_teaching_group_idx` (`teaching_group`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DB-005 Student (v1.2 dual-dimension status core)
CREATE TABLE IF NOT EXISTS `student` (
  `id`                    VARCHAR(30) NOT NULL,
  `student_no`            VARCHAR(30) NOT NULL,
  `name`                  VARCHAR(50) NOT NULL,
  `gender`                VARCHAR(16) NOT NULL,
  `class_id`              VARCHAR(30) NOT NULL,
  `grade_id`              VARCHAR(30) NOT NULL,
  `school_id`             VARCHAR(30) NOT NULL,
  `boarding_type`         VARCHAR(32) NOT NULL,
  `dorm_id`               VARCHAR(30) NULL,
  `bed_no`                VARCHAR(20) NULL,
  `current_status`        VARCHAR(32) NOT NULL DEFAULT 'ON_CAMPUS',
  `current_location`      VARCHAR(32) NOT NULL DEFAULT 'UNKNOWN',
  `status_updated_at`     DATETIME(3) NULL,
  `location_updated_at`   DATETIME(3) NULL,
  `phone`                 VARCHAR(20) NULL,
  `enrolled_at`           DATETIME(3) NOT NULL,
  `graduated_at`          DATETIME(3) NULL,
  `transferred_at`        DATETIME(3) NULL,
  `created_at`            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at`            DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `student_student_no_key` (`student_no`),
  KEY `idx_student_status_location` (`school_id`,`grade_id`,`class_id`,`current_status`,`current_location`),
  KEY `student_school_id_current_status_idx` (`school_id`,`current_status`),
  KEY `student_school_id_current_location_idx` (`school_id`,`current_location`),
  KEY `student_class_id_current_status_idx` (`class_id`,`current_status`),
  KEY `student_dorm_id_current_status_idx` (`dorm_id`,`current_status`),
  KEY `student_boarding_type_current_status_idx` (`boarding_type`,`current_status`),
  KEY `student_school_id_class_id_name_idx` (`school_id`,`class_id`,`name`),
  KEY `student_student_no_idx` (`student_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DB-006 Parent
CREATE TABLE IF NOT EXISTS `parent` (
  `id`                 VARCHAR(30) NOT NULL,
  `name`               VARCHAR(50) NOT NULL,
  `relation`           VARCHAR(32) NOT NULL,
  `phone`              VARCHAR(20) NOT NULL,
  `wechat_openid`      VARCHAR(100) NULL,
  `wechat_unionid`     VARCHAR(100) NULL,
  `email`              VARCHAR(100) NULL,
  `avatar`             VARCHAR(255) NULL,
  `status`             VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  `notify_preference`  VARCHAR(32) NOT NULL DEFAULT 'ALL',
  `created_at`         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at`         DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `parent_phone_key` (`phone`),
  UNIQUE KEY `parent_wechat_openid_key` (`wechat_openid`),
  KEY `parent_phone_idx` (`phone`),
  KEY `parent_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DB-007 StudentParent
CREATE TABLE IF NOT EXISTS `student_parent` (
  `id`          VARCHAR(30) NOT NULL,
  `student_id`  VARCHAR(30) NOT NULL,
  `parent_id`   VARCHAR(30) NOT NULL,
  `is_primary`  TINYINT(1) NOT NULL DEFAULT 0,
  `created_at`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `student_parent_student_id_parent_id_key` (`student_id`,`parent_id`),
  KEY `student_parent_parent_id_idx` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DB-008 User
CREATE TABLE IF NOT EXISTS `user` (
  `id`               VARCHAR(30) NOT NULL,
  `username`         VARCHAR(50) NULL,
  `password_hash`    VARCHAR(255) NULL,
  `user_type`        VARCHAR(32) NOT NULL,
  `teacher_id`       VARCHAR(30) NULL,
  `student_id`       VARCHAR(30) NULL,
  `parent_id`        VARCHAR(30) NULL,
  `status`           VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  `last_login_at`    DATETIME(3) NULL,
  `last_login_ip`    VARCHAR(45) NULL,
  `created_at`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at`       DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_username_key` (`username`),
  UNIQUE KEY `user_teacher_id_key` (`teacher_id`),
  UNIQUE KEY `user_student_id_key` (`student_id`),
  UNIQUE KEY `user_parent_id_key` (`parent_id`),
  KEY `user_user_type_status_idx` (`user_type`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DB-009 UserIdentity (5 providers)
CREATE TABLE IF NOT EXISTS `user_identity` (
  `id`                VARCHAR(30) NOT NULL,
  `user_id`           VARCHAR(30) NOT NULL,
  `provider`          VARCHAR(32) NOT NULL,
  `external_id`       VARCHAR(200) NOT NULL,
  `credential_hash`   VARCHAR(255) NULL,
  `verified`          TINYINT(1) NOT NULL DEFAULT 0,
  `verified_at`       DATETIME(3) NULL,
  `status`            VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  `created_at`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at`        DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_identity_provider_external_id_key` (`provider`,`external_id`),
  KEY `user_identity_user_id_idx` (`user_id`),
  KEY `user_identity_provider_status_idx` (`provider`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- Step 2 + 3: Business core models (9 tables)
-- =====================================================================

-- DB-010 DormBuilding
CREATE TABLE IF NOT EXISTS `dorm_building` (
  `id`          VARCHAR(30) NOT NULL,
  `school_id`   VARCHAR(30) NOT NULL,
  `name`        VARCHAR(50) NOT NULL,
  `gender`      VARCHAR(16) NOT NULL,
  `floors`      INT NOT NULL DEFAULT 5,
  `manager_id`  VARCHAR(30) NULL,
  `created_at`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at`  DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  KEY `dorm_building_school_id_idx` (`school_id`),
  KEY `dorm_building_manager_id_idx` (`manager_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DB-011 DormRoom
CREATE TABLE IF NOT EXISTS `dorm_room` (
  `id`              VARCHAR(30) NOT NULL,
  `building_id`     VARCHAR(30) NOT NULL,
  `floor`           INT NOT NULL,
  `room_no`         VARCHAR(20) NOT NULL,
  `capacity`        INT NOT NULL DEFAULT 4,
  `current_count`   INT NOT NULL DEFAULT 0,
  `status`          VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
  `created_at`      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at`      DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dorm_room_building_id_room_no_key` (`building_id`,`room_no`),
  KEY `dorm_room_building_id_floor_idx` (`building_id`,`floor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DB-012 TeacherClassRelation
CREATE TABLE IF NOT EXISTS `teacher_class_relation` (
  `id`          VARCHAR(30) NOT NULL,
  `teacher_id`  VARCHAR(30) NOT NULL,
  `class_id`    VARCHAR(30) NOT NULL,
  `role`        VARCHAR(32) NOT NULL,
  `subject`     VARCHAR(50) NULL,
  `start_date`  DATETIME(3) NOT NULL,
  `end_date`    DATETIME(3) NULL,
  `created_at`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_teacher_class_role_start` (`teacher_id`,`class_id`,`role`,`start_date`),
  KEY `teacher_class_relation_class_id_role_end_date_idx` (`class_id`,`role`,`end_date`),
  KEY `teacher_class_relation_teacher_id_role_end_date_idx` (`teacher_id`,`role`,`end_date`),
  KEY `idx_tcr_period` (`class_id`,`role`,`start_date`,`end_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DB-013 LeaveRecord (v1.2 8 statuses + 6 reasons)
CREATE TABLE IF NOT EXISTS `leave_record` (
  `id`                     VARCHAR(30) NOT NULL,
  `leave_no`               VARCHAR(30) NOT NULL,
  `student_id`             VARCHAR(30) NOT NULL,
  `student_name`           VARCHAR(50) NOT NULL,
  `class_id`               VARCHAR(30) NOT NULL,
  `class_name`             VARCHAR(50) NOT NULL,
  `grade_id`               VARCHAR(30) NOT NULL,
  `school_id`              VARCHAR(30) NOT NULL,
  `leave_type`             VARCHAR(32) NOT NULL,
  `leave_reason_type`      VARCHAR(32) NOT NULL,
  `reason`                 TEXT NOT NULL,
  `start_at`               DATETIME(3) NOT NULL,
  `end_at`                 DATETIME(3) NOT NULL,
  `expected_return_time`   DATETIME(3) NULL,
  `expected_return_note`   VARCHAR(255) NULL,
  `actual_left_at`         DATETIME(3) NULL,
  `actual_returned_at`     DATETIME(3) NULL,
  `closed_at`              DATETIME(3) NULL,
  `status`                 VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  `applicant_id`           VARCHAR(30) NOT NULL,
  `applicant_name`         VARCHAR(50) NOT NULL,
  `approver_id`            VARCHAR(30) NULL,
  `approver_name`          VARCHAR(50) NULL,
  `approve_remark`         TEXT NULL,
  `approved_at`            DATETIME(3) NULL,
  `reject_reason`          TEXT NULL,
  `rejected_at`            DATETIME(3) NULL,
  `cancel_reason`          TEXT NULL,
  `return_judgment`        VARCHAR(32) NULL,
  `attachment_ids`         JSON NULL,
  `created_at`             DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`             DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at`             DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `leave_record_leave_no_key` (`leave_no`),
  KEY `leave_record_student_id_status_idx` (`student_id`,`status`),
  KEY `leave_record_class_id_status_start_at_idx` (`class_id`,`status`,`start_at`),
  KEY `leave_record_grade_id_status_start_at_idx` (`grade_id`,`status`,`start_at`),
  KEY `leave_record_school_id_status_start_at_idx` (`school_id`,`status`,`start_at`),
  KEY `leave_record_leave_reason_type_start_at_idx` (`leave_reason_type`,`start_at`),
  KEY `leave_record_start_at_idx` (`start_at`),
  KEY `leave_record_applicant_id_idx` (`applicant_id`),
  KEY `leave_record_approver_id_idx` (`approver_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DB-014 Notice
CREATE TABLE IF NOT EXISTS `notice` (
  `id`                VARCHAR(30) NOT NULL,
  `notice_no`         VARCHAR(30) NOT NULL,
  `title`             VARCHAR(200) NOT NULL,
  `content`           TEXT NOT NULL,
  `content_format`    VARCHAR(20) NOT NULL DEFAULT 'PLAIN',
  `notice_type`       VARCHAR(32) NOT NULL,
  `targets`           JSON NULL,
  `require_confirm`   TINYINT(1) NOT NULL DEFAULT 0,
  `confirm_deadline`  DATETIME(3) NULL,
  `publisher_id`      VARCHAR(30) NOT NULL,
  `publisher_name`    VARCHAR(50) NOT NULL,
  `status`            VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  `published_at`      DATETIME(3) NULL,
  `archived_at`       DATETIME(3) NULL,
  `school_id`         VARCHAR(30) NOT NULL,
  `created_at`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at`        DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `notice_notice_no_key` (`notice_no`),
  KEY `notice_publisher_id_idx` (`publisher_id`),
  KEY `notice_school_id_status_published_at_idx` (`school_id`,`status`,`published_at`),
  KEY `notice_notice_type_status_idx` (`notice_type`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DB-015 NoticeRead
CREATE TABLE IF NOT EXISTS `notice_read` (
  `id`           BIGINT AUTO_INCREMENT NOT NULL,
  `notice_id`    VARCHAR(30) NOT NULL,
  `teacher_id`   VARCHAR(30) NOT NULL,
  `is_read`      TINYINT(1) NOT NULL DEFAULT 0,
  `read_at`      DATETIME(3) NULL,
  `confirm_at`   DATETIME(3) NULL,
  `created_at`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `notice_read_notice_id_teacher_id_key` (`notice_id`,`teacher_id`),
  KEY `notice_read_teacher_id_is_read_idx` (`teacher_id`,`is_read`),
  KEY `notice_read_notice_id_is_read_idx` (`notice_id`,`is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DB-016 Task (independent from Notice, incl. OVERDUE)
CREATE TABLE IF NOT EXISTS `task` (
  `id`                  VARCHAR(30) NOT NULL,
  `task_no`             VARCHAR(30) NOT NULL,
  `title`               VARCHAR(200) NOT NULL,
  `content`             TEXT NULL,
  `status`              VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  `priority`            VARCHAR(32) NOT NULL DEFAULT 'NORMAL',
  `source`              VARCHAR(32) NOT NULL,
  `source_id`           VARCHAR(30) NULL,
  `assignee_id`         VARCHAR(30) NOT NULL,
  `assignee_name`       VARCHAR(50) NOT NULL,
  `creator_id`          VARCHAR(30) NOT NULL,
  `creator_name`        VARCHAR(50) NOT NULL,
  `school_id`           VARCHAR(30) NOT NULL,
  `due_at`              DATETIME(3) NOT NULL,
  `completed_at`        DATETIME(3) NULL,
  `completion_remark`   TEXT NULL,
  `reminder_count`      INT NOT NULL DEFAULT 0,
  `last_reminded_at`    DATETIME(3) NULL,
  `created_at`          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at`          DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `task_task_no_key` (`task_no`),
  KEY `task_assignee_id_status_idx` (`assignee_id`,`status`),
  KEY `task_school_id_status_due_at_idx` (`school_id`,`status`,`due_at`),
  KEY `task_creator_id_status_idx` (`creator_id`,`status`),
  KEY `task_source_source_id_idx` (`source`,`source_id`),
  KEY `task_due_at_idx` (`due_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- Step 4: TimelineEvent (21 events + metadata JSON, AI friendly)
-- =====================================================================

-- DB-017 TimelineEvent
CREATE TABLE IF NOT EXISTS `timeline_event` (
  `id`               VARCHAR(30) NOT NULL,
  `event_type`       VARCHAR(64) NOT NULL,
  `event_source`     VARCHAR(32) NOT NULL,
  `source_event_id`  VARCHAR(100) NOT NULL,
  `student_id`       VARCHAR(30) NOT NULL,
  `operator_id`      VARCHAR(30) NULL,
  `operator_name`    VARCHAR(50) NULL,
  `operator_role`    VARCHAR(50) NULL,
  `metadata`         JSON NULL,
  `occurred_at`      DATETIME(3) NOT NULL,
  `recorded_at`      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `class_id`         VARCHAR(30) NULL,
  `grade_id`         VARCHAR(30) NULL,
  `school_id`        VARCHAR(30) NULL,
  `leave_record_id`  VARCHAR(30) NULL,
  `notice_id`        VARCHAR(30) NULL,
  `related_type`     VARCHAR(32) NULL,
  `related_id`       VARCHAR(100) NULL,
  `is_system`        TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_student_source_event` (`student_id`,`event_source`,`source_event_id`),
  KEY `idx_student_time_desc` (`student_id`,`occurred_at` DESC),
  KEY `timeline_event_student_id_event_type_idx` (`student_id`,`event_type`),
  KEY `timeline_event_class_id_occurred_at_idx` (`class_id`,`occurred_at` DESC),
  KEY `timeline_event_grade_id_occurred_at_idx` (`grade_id`,`occurred_at` DESC),
  KEY `timeline_event_school_id_occurred_at_idx` (`school_id`,`occurred_at` DESC),
  KEY `timeline_event_event_source_occurred_at_idx` (`event_source`,`occurred_at` DESC),
  KEY `timeline_event_event_type_occurred_at_idx` (`event_type`,`occurred_at` DESC),
  KEY `timeline_event_leave_record_id_idx` (`leave_record_id`),
  KEY `timeline_event_notice_id_idx` (`notice_id`),
  KEY `idx_related` (`related_type`,`related_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- Permission models (6 tables)
-- =====================================================================

-- DB-018 Role
CREATE TABLE IF NOT EXISTS `role` (
  `id`           BIGINT AUTO_INCREMENT NOT NULL,
  `role_code`    VARCHAR(50) NOT NULL,
  `role_name`    VARCHAR(50) NOT NULL,
  `description`  TEXT NULL,
  `created_at`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_role_code_key` (`role_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DB-019 Permission
CREATE TABLE IF NOT EXISTS `permission` (
  `id`                BIGINT AUTO_INCREMENT NOT NULL,
  `permission_code`   VARCHAR(50) NOT NULL,
  `permission_name`   VARCHAR(50) NOT NULL,
  `resource`          VARCHAR(50) NOT NULL,
  `action`            VARCHAR(50) NOT NULL,
  `description`       TEXT NULL,
  `created_at`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `permission_permission_code_key` (`permission_code`),
  KEY `permission_resource_action_idx` (`resource`,`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DB-020 RolePermission
CREATE TABLE IF NOT EXISTS `role_permission` (
  `id`             BIGINT AUTO_INCREMENT NOT NULL,
  `role_id`        BIGINT NOT NULL,
  `permission_id`  BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_permission_role_id_permission_id_key` (`role_id`,`permission_id`),
  KEY `role_permission_permission_id_idx` (`permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DB-021 Tag
CREATE TABLE IF NOT EXISTS `tag` (
  `id`           BIGINT AUTO_INCREMENT NOT NULL,
  `tag_code`     VARCHAR(50) NOT NULL,
  `tag_name`     VARCHAR(50) NOT NULL,
  `description`  TEXT NULL,
  `created_at`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `tag_tag_code_key` (`tag_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- Foreign key constraints (21 FKs matching schema.prisma relations)
-- =====================================================================

-- Grade.schoolId
ALTER TABLE `grade` ADD CONSTRAINT `grade_school_id_fkey` FOREIGN KEY IF NOT EXISTS (`school_id`) REFERENCES `school`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
-- Grade.directorId
ALTER TABLE `grade` ADD CONSTRAINT `grade_director_id_fkey` FOREIGN KEY IF NOT EXISTS (`director_id`) REFERENCES `teacher`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Class.gradeId
ALTER TABLE `class` ADD CONSTRAINT `class_grade_id_fkey` FOREIGN KEY IF NOT EXISTS (`grade_id`) REFERENCES `grade`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
-- Class.headTeacherId
ALTER TABLE `class` ADD CONSTRAINT `class_head_teacher_id_fkey` FOREIGN KEY IF NOT EXISTS (`head_teacher_id`) REFERENCES `teacher`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
-- Class.viceHeadTeacherId
ALTER TABLE `class` ADD CONSTRAINT `class_vice_head_teacher_id_fkey` FOREIGN KEY IF NOT EXISTS (`vice_head_teacher_id`) REFERENCES `teacher`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Student.classId
ALTER TABLE `student` ADD CONSTRAINT `student_class_id_fkey` FOREIGN KEY IF NOT EXISTS (`class_id`) REFERENCES `class`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
-- Student.gradeId
ALTER TABLE `student` ADD CONSTRAINT `student_grade_id_fkey` FOREIGN KEY IF NOT EXISTS (`grade_id`) REFERENCES `grade`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
-- Student.dormId
ALTER TABLE `student` ADD CONSTRAINT `student_dorm_id_fkey` FOREIGN KEY IF NOT EXISTS (`dorm_id`) REFERENCES `dorm_room`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- StudentParent.studentId
ALTER TABLE `student_parent` ADD CONSTRAINT `student_parent_student_id_fkey` FOREIGN KEY IF NOT EXISTS (`student_id`) REFERENCES `student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
-- StudentParent.parentId
ALTER TABLE `student_parent` ADD CONSTRAINT `student_parent_parent_id_fkey` FOREIGN KEY IF NOT EXISTS (`parent_id`) REFERENCES `parent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- User.teacherId / studentId / parentId
ALTER TABLE `user` ADD CONSTRAINT `user_teacher_id_fkey` FOREIGN KEY IF NOT EXISTS (`teacher_id`) REFERENCES `teacher`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `user` ADD CONSTRAINT `user_student_id_fkey` FOREIGN KEY IF NOT EXISTS (`student_id`) REFERENCES `student`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `user` ADD CONSTRAINT `user_parent_id_fkey` FOREIGN KEY IF NOT EXISTS (`parent_id`) REFERENCES `parent`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- UserIdentity.userId
ALTER TABLE `user_identity` ADD CONSTRAINT `user_identity_user_id_fkey` FOREIGN KEY IF NOT EXISTS (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- DormBuilding.managerId
ALTER TABLE `dorm_building` ADD CONSTRAINT `dorm_building_manager_id_fkey` FOREIGN KEY IF NOT EXISTS (`manager_id`) REFERENCES `teacher`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- DormRoom.buildingId
ALTER TABLE `dorm_room` ADD CONSTRAINT `dorm_room_building_id_fkey` FOREIGN KEY IF NOT EXISTS (`building_id`) REFERENCES `dorm_building`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- TeacherClassRelation.teacherId
ALTER TABLE `teacher_class_relation` ADD CONSTRAINT `teacher_class_relation_teacher_id_fkey` FOREIGN KEY IF NOT EXISTS (`teacher_id`) REFERENCES `teacher`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
-- TeacherClassRelation.classId
ALTER TABLE `teacher_class_relation` ADD CONSTRAINT `teacher_class_relation_class_id_fkey` FOREIGN KEY IF NOT EXISTS (`class_id`) REFERENCES `class`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- LeaveRecord.studentId
ALTER TABLE `leave_record` ADD CONSTRAINT `leave_record_student_id_fkey` FOREIGN KEY IF NOT EXISTS (`student_id`) REFERENCES `student`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
-- LeaveRecord.applicantId
ALTER TABLE `leave_record` ADD CONSTRAINT `leave_record_applicant_id_fkey` FOREIGN KEY IF NOT EXISTS (`applicant_id`) REFERENCES `teacher`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
-- LeaveRecord.approverId
ALTER TABLE `leave_record` ADD CONSTRAINT `leave_record_approver_id_fkey` FOREIGN KEY IF NOT EXISTS (`approver_id`) REFERENCES `teacher`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Notice.publisherId
ALTER TABLE `notice` ADD CONSTRAINT `notice_publisher_id_fkey` FOREIGN KEY IF NOT EXISTS (`publisher_id`) REFERENCES `teacher`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- NoticeRead.noticeId
ALTER TABLE `notice_read` ADD CONSTRAINT `notice_read_notice_id_fkey` FOREIGN KEY IF NOT EXISTS (`notice_id`) REFERENCES `notice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
-- NoticeRead.teacherId
ALTER TABLE `notice_read` ADD CONSTRAINT `notice_read_teacher_id_fkey` FOREIGN KEY IF NOT EXISTS (`teacher_id`) REFERENCES `teacher`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Task.assigneeId
ALTER TABLE `task` ADD CONSTRAINT `task_assignee_id_fkey` FOREIGN KEY IF NOT EXISTS (`assignee_id`) REFERENCES `teacher`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
-- Task.creatorId
ALTER TABLE `task` ADD CONSTRAINT `task_creator_id_fkey` FOREIGN KEY IF NOT EXISTS (`creator_id`) REFERENCES `teacher`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- TimelineEvent.studentId
ALTER TABLE `timeline_event` ADD CONSTRAINT `timeline_event_student_id_fkey` FOREIGN KEY IF NOT EXISTS (`student_id`) REFERENCES `student`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
-- TimelineEvent.operatorId
ALTER TABLE `timeline_event` ADD CONSTRAINT `timeline_event_operator_id_fkey` FOREIGN KEY IF NOT EXISTS (`operator_id`) REFERENCES `teacher`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
-- TimelineEvent.leaveRecordId
ALTER TABLE `timeline_event` ADD CONSTRAINT `timeline_event_leave_record_id_fkey` FOREIGN KEY IF NOT EXISTS (`leave_record_id`) REFERENCES `leave_record`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
-- TimelineEvent.noticeId
ALTER TABLE `timeline_event` ADD CONSTRAINT `timeline_event_notice_id_fkey` FOREIGN KEY IF NOT EXISTS (`notice_id`) REFERENCES `notice`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
