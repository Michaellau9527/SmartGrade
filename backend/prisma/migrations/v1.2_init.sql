-- CreateTable
CREATE TABLE `school` (
    `id` VARCHAR(191) NOT NULL,
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
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `school_code_key`(`code`),
    INDEX `school_status_idx`(`status`),
    INDEX `school_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `grade` (
    `id` VARCHAR(191) NOT NULL,
    `school_id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(30) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `enrollment_year` INTEGER NOT NULL,
    `graduation_year` INTEGER NOT NULL,
    `stage` ENUM('GRADE_10', 'GRADE_11', 'GRADE_12', 'GRADUATED') NOT NULL,
    `director_id` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'GRADUATED', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `grade_school_id_status_idx`(`school_id`, `status`),
    INDEX `grade_director_id_idx`(`director_id`),
    UNIQUE INDEX `grade_school_id_code_key`(`school_id`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `class` (
    `id` VARCHAR(191) NOT NULL,
    `grade_id` VARCHAR(191) NOT NULL,
    `school_id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(30) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `head_teacher_id` VARCHAR(191) NULL,
    `vice_head_teacher_id` VARCHAR(191) NULL,
    `student_count` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('ACTIVE', 'GRADUATED', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `class_school_id_grade_id_status_idx`(`school_id`, `grade_id`, `status`),
    INDEX `class_head_teacher_id_idx`(`head_teacher_id`),
    UNIQUE INDEX `class_grade_id_code_key`(`grade_id`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teacher` (
    `id` VARCHAR(191) NOT NULL,
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
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `teacher_teacher_no_key`(`teacher_no`),
    INDEX `teacher_status_idx`(`status`),
    INDEX `teacher_phone_idx`(`phone`),
    INDEX `teacher_teaching_group_idx`(`teaching_group`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student` (
    `id` VARCHAR(191) NOT NULL,
    `student_no` VARCHAR(30) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `gender` ENUM('MALE', 'FEMALE', 'OTHER') NOT NULL,
    `class_id` VARCHAR(191) NOT NULL,
    `grade_id` VARCHAR(191) NOT NULL,
    `school_id` VARCHAR(191) NOT NULL,
    `boarding_type` ENUM('BOARDING', 'DAY_STUDENT') NOT NULL,
    `dorm_id` VARCHAR(191) NULL,
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
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `student_student_no_key`(`student_no`),
    INDEX `idx_student_status_location`(`school_id`, `grade_id`, `class_id`, `current_status`, `current_location`),
    INDEX `student_school_id_current_status_idx`(`school_id`, `current_status`),
    INDEX `student_school_id_current_location_idx`(`school_id`, `current_location`),
    INDEX `student_class_id_current_status_idx`(`class_id`, `current_status`),
    INDEX `student_dorm_id_current_status_idx`(`dorm_id`, `current_status`),
    INDEX `student_boarding_type_current_status_idx`(`boarding_type`, `current_status`),
    INDEX `student_school_id_class_id_name_idx`(`school_id`, `class_id`, `name`),
    INDEX `student_student_no_idx`(`student_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `parent` (
    `id` VARCHAR(191) NOT NULL,
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
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `parent_phone_key`(`phone`),
    UNIQUE INDEX `parent_wechat_openid_key`(`wechat_openid`),
    INDEX `parent_phone_idx`(`phone`),
    INDEX `parent_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_parent` (
    `id` VARCHAR(191) NOT NULL,
    `student_id` VARCHAR(191) NOT NULL,
    `parent_id` VARCHAR(191) NOT NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `student_parent_parent_id_idx`(`parent_id`),
    UNIQUE INDEX `student_parent_student_id_parent_id_key`(`student_id`, `parent_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(50) NULL,
    `password_hash` VARCHAR(255) NULL,
    `user_type` ENUM('SYSTEM_ADMIN', 'TEACHER', 'STUDENT', 'PARENT') NOT NULL,
    `teacher_id` VARCHAR(191) NULL,
    `student_id` VARCHAR(191) NULL,
    `parent_id` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'FROZEN', 'LOCKED') NOT NULL DEFAULT 'ACTIVE',
    `last_login_at` DATETIME(3) NULL,
    `last_login_ip` VARCHAR(45) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `user_username_key`(`username`),
    UNIQUE INDEX `user_teacher_id_key`(`teacher_id`),
    UNIQUE INDEX `user_student_id_key`(`student_id`),
    UNIQUE INDEX `user_parent_id_key`(`parent_id`),
    INDEX `user_user_type_status_idx`(`user_type`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_identity` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `provider` ENUM('PHONE', 'WECHAT', 'ACCOUNT', 'DINGTALK', 'FEISHU') NOT NULL,
    `external_id` VARCHAR(200) NOT NULL,
    `credential_hash` VARCHAR(255) NULL,
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `verified_at` DATETIME(3) NULL,
    `status` ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `user_identity_user_id_idx`(`user_id`),
    INDEX `user_identity_provider_status_idx`(`provider`, `status`),
    UNIQUE INDEX `user_identity_provider_external_id_key`(`provider`, `external_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dorm_building` (
    `id` VARCHAR(191) NOT NULL,
    `school_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `gender` ENUM('MALE', 'FEMALE', 'OTHER') NOT NULL,
    `floors` INTEGER NOT NULL DEFAULT 5,
    `manager_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `dorm_building_school_id_idx`(`school_id`),
    INDEX `dorm_building_manager_id_idx`(`manager_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dorm_room` (
    `id` VARCHAR(191) NOT NULL,
    `building_id` VARCHAR(191) NOT NULL,
    `floor` INTEGER NOT NULL,
    `room_no` VARCHAR(20) NOT NULL,
    `capacity` INTEGER NOT NULL DEFAULT 4,
    `current_count` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `dorm_room_building_id_floor_idx`(`building_id`, `floor`),
    UNIQUE INDEX `dorm_room_building_id_room_no_key`(`building_id`, `room_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teacher_class_relation` (
    `id` VARCHAR(191) NOT NULL,
    `teacher_id` VARCHAR(191) NOT NULL,
    `class_id` VARCHAR(191) NOT NULL,
    `role` ENUM('HEAD_TEACHER', 'SUBJECT_TEACHER', 'VICE_HEAD_TEACHER', 'COUNSELOR') NOT NULL,
    `subject` VARCHAR(50) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `teacher_class_relation_class_id_role_idx`(`class_id`, `role`),
    INDEX `teacher_class_relation_teacher_id_role_idx`(`teacher_id`, `role`),
    UNIQUE INDEX `teacher_class_relation_teacher_id_class_id_role_key`(`teacher_id`, `class_id`, `role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leave_record` (
    `id` VARCHAR(191) NOT NULL,
    `leave_no` VARCHAR(30) NOT NULL,
    `student_id` VARCHAR(191) NOT NULL,
    `student_name` VARCHAR(50) NOT NULL,
    `class_id` VARCHAR(191) NOT NULL,
    `class_name` VARCHAR(50) NOT NULL,
    `grade_id` VARCHAR(191) NOT NULL,
    `school_id` VARCHAR(191) NOT NULL,
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
    `applicant_id` VARCHAR(191) NOT NULL,
    `applicant_name` VARCHAR(50) NOT NULL,
    `approver_id` VARCHAR(191) NULL,
    `approver_name` VARCHAR(50) NULL,
    `approve_remark` TEXT NULL,
    `approved_at` DATETIME(3) NULL,
    `reject_reason` TEXT NULL,
    `rejected_at` DATETIME(3) NULL,
    `cancel_reason` TEXT NULL,
    `return_judgment` ENUM('ON_TIME', 'EARLY', 'DELAYED', 'NOT_SET') NULL,
    `attachment_ids` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `leave_record_leave_no_key`(`leave_no`),
    INDEX `leave_record_student_id_status_idx`(`student_id`, `status`),
    INDEX `leave_record_class_id_status_start_at_idx`(`class_id`, `status`, `start_at`),
    INDEX `leave_record_grade_id_status_start_at_idx`(`grade_id`, `status`, `start_at`),
    INDEX `leave_record_school_id_status_start_at_idx`(`school_id`, `status`, `start_at`),
    INDEX `leave_record_leave_reason_type_start_at_idx`(`leave_reason_type`, `start_at`),
    INDEX `leave_record_start_at_idx`(`start_at`),
    INDEX `leave_record_applicant_id_idx`(`applicant_id`),
    INDEX `leave_record_approver_id_idx`(`approver_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notice` (
    `id` VARCHAR(191) NOT NULL,
    `notice_no` VARCHAR(30) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `content` TEXT NOT NULL,
    `content_format` VARCHAR(20) NOT NULL DEFAULT 'PLAIN',
    `notice_type` ENUM('NOTICE', 'URGENT', 'MEETING', 'HOLIDAY', 'TEACHING') NOT NULL,
    `targets` JSON NOT NULL,
    `require_confirm` BOOLEAN NOT NULL DEFAULT false,
    `confirm_deadline` DATETIME(3) NULL,
    `publisher_id` VARCHAR(191) NOT NULL,
    `publisher_name` VARCHAR(50) NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `published_at` DATETIME(3) NULL,
    `archived_at` DATETIME(3) NULL,
    `school_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `notice_notice_no_key`(`notice_no`),
    INDEX `notice_publisher_id_idx`(`publisher_id`),
    INDEX `notice_school_id_status_published_at_idx`(`school_id`, `status`, `published_at`),
    INDEX `notice_notice_type_status_idx`(`notice_type`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notice_read` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `notice_id` VARCHAR(191) NOT NULL,
    `teacher_id` VARCHAR(191) NOT NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `read_at` DATETIME(3) NULL,
    `confirm_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notice_read_teacher_id_is_read_idx`(`teacher_id`, `is_read`),
    INDEX `notice_read_notice_id_is_read_idx`(`notice_id`, `is_read`),
    UNIQUE INDEX `notice_read_notice_id_teacher_id_key`(`notice_id`, `teacher_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task` (
    `id` VARCHAR(191) NOT NULL,
    `task_no` VARCHAR(30) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `content` TEXT NULL,
    `status` ENUM('DRAFT', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'DEFERRED', 'CANCELLED', 'OVERDUE') NOT NULL DEFAULT 'PENDING',
    `priority` ENUM('URGENT', 'HIGH', 'NORMAL', 'LOW') NOT NULL DEFAULT 'NORMAL',
    `source` ENUM('GRADE_DIRECTOR', 'HEAD_TEACHER', 'SYSTEM_TEMPLATE', 'CROSS_DEPARTMENT', 'OTHER') NOT NULL,
    `source_id` VARCHAR(191) NULL,
    `assignee_id` VARCHAR(191) NOT NULL,
    `assignee_name` VARCHAR(50) NOT NULL,
    `creator_id` VARCHAR(191) NOT NULL,
    `creator_name` VARCHAR(50) NOT NULL,
    `school_id` VARCHAR(191) NOT NULL,
    `due_at` DATETIME(3) NOT NULL,
    `completed_at` DATETIME(3) NULL,
    `completion_remark` TEXT NULL,
    `reminder_count` INTEGER NOT NULL DEFAULT 0,
    `last_reminded_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `task_task_no_key`(`task_no`),
    INDEX `task_assignee_id_status_idx`(`assignee_id`, `status`),
    INDEX `task_school_id_status_due_at_idx`(`school_id`, `status`, `due_at`),
    INDEX `task_creator_id_status_idx`(`creator_id`, `status`),
    INDEX `task_source_source_id_idx`(`source`, `source_id`),
    INDEX `task_due_at_idx`(`due_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `timeline_event` (
    `id` VARCHAR(191) NOT NULL,
    `event_type` ENUM('LEAVE_CREATED', 'LEAVE_SUBMITTED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_CANCELLED', 'LEAVE_GATE_LEFT', 'LEAVE_RETURNED', 'LEAVE_CLOSED', 'LEAVE_EDITED', 'LEAVE_RESUBMITTED', 'DORM_ABSENT', 'DORM_LATE', 'DORM_CHECKED_IN', 'NOTICE_SENT', 'NOTICE_READ', 'INCIDENT_RECORDED', 'INCIDENT_HANDLED', 'STUDENT_ENROLLED', 'STUDENT_GRADUATED', 'STUDENT_TRANSFERRED', 'STUDENT_STATUS_CHANGED') NOT NULL,
    `event_source` ENUM('LEAVE', 'DORM', 'NOTICE', 'INCIDENT', 'STUDENT') NOT NULL,
    `source_event_id` VARCHAR(100) NOT NULL,
    `student_id` VARCHAR(191) NOT NULL,
    `operator_id` VARCHAR(191) NULL,
    `operator_name` VARCHAR(50) NULL,
    `operator_role` VARCHAR(50) NULL,
    `metadata` JSON NOT NULL,
    `occurred_at` DATETIME(3) NOT NULL,
    `recorded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `class_id` VARCHAR(191) NULL,
    `grade_id` VARCHAR(191) NULL,
    `school_id` VARCHAR(191) NULL,
    `leave_record_id` VARCHAR(191) NULL,
    `notice_id` VARCHAR(191) NULL,
    `is_system` BOOLEAN NOT NULL DEFAULT false,

    INDEX `idx_student_time_desc`(`student_id`, `occurred_at` DESC),
    INDEX `timeline_event_student_id_event_type_idx`(`student_id`, `event_type`),
    INDEX `timeline_event_class_id_occurred_at_idx`(`class_id`, `occurred_at` DESC),
    INDEX `timeline_event_grade_id_occurred_at_idx`(`grade_id`, `occurred_at` DESC),
    INDEX `timeline_event_school_id_occurred_at_idx`(`school_id`, `occurred_at` DESC),
    INDEX `timeline_event_event_source_occurred_at_idx`(`event_source`, `occurred_at` DESC),
    INDEX `timeline_event_event_type_occurred_at_idx`(`event_type`, `occurred_at` DESC),
    INDEX `timeline_event_leave_record_id_idx`(`leave_record_id`),
    INDEX `timeline_event_notice_id_idx`(`notice_id`),
    UNIQUE INDEX `timeline_event_student_id_event_source_source_event_id_key`(`student_id`, `event_source`, `source_event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `role_code` VARCHAR(50) NOT NULL,
    `role_name` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `role_role_code_key`(`role_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permission` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `permission_code` VARCHAR(50) NOT NULL,
    `permission_name` VARCHAR(50) NOT NULL,
    `resource` VARCHAR(50) NOT NULL,
    `action` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `permission_permission_code_key`(`permission_code`),
    INDEX `permission_resource_action_idx`(`resource`, `action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permission` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `role_id` BIGINT NOT NULL,
    `permission_id` BIGINT NOT NULL,

    INDEX `role_permission_permission_id_idx`(`permission_id`),
    UNIQUE INDEX `role_permission_role_id_permission_id_key`(`role_id`, `permission_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tag` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `tag_code` VARCHAR(50) NOT NULL,
    `tag_name` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tag_tag_code_key`(`tag_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `grade` ADD CONSTRAINT `grade_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `school`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grade` ADD CONSTRAINT `grade_director_id_fkey` FOREIGN KEY (`director_id`) REFERENCES `teacher`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `class` ADD CONSTRAINT `class_grade_id_fkey` FOREIGN KEY (`grade_id`) REFERENCES `grade`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `class` ADD CONSTRAINT `class_head_teacher_id_fkey` FOREIGN KEY (`head_teacher_id`) REFERENCES `teacher`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `class` ADD CONSTRAINT `class_vice_head_teacher_id_fkey` FOREIGN KEY (`vice_head_teacher_id`) REFERENCES `teacher`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student` ADD CONSTRAINT `student_class_id_fkey` FOREIGN KEY (`class_id`) REFERENCES `class`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student` ADD CONSTRAINT `student_dorm_id_fkey` FOREIGN KEY (`dorm_id`) REFERENCES `dorm_room`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_parent` ADD CONSTRAINT `student_parent_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_parent` ADD CONSTRAINT `student_parent_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `parent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user` ADD CONSTRAINT `user_teacher_id_fkey` FOREIGN KEY (`teacher_id`) REFERENCES `teacher`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user` ADD CONSTRAINT `user_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `parent`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_identity` ADD CONSTRAINT `user_identity_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dorm_building` ADD CONSTRAINT `dorm_building_manager_id_fkey` FOREIGN KEY (`manager_id`) REFERENCES `teacher`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dorm_room` ADD CONSTRAINT `dorm_room_building_id_fkey` FOREIGN KEY (`building_id`) REFERENCES `dorm_building`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teacher_class_relation` ADD CONSTRAINT `teacher_class_relation_teacher_id_fkey` FOREIGN KEY (`teacher_id`) REFERENCES `teacher`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teacher_class_relation` ADD CONSTRAINT `teacher_class_relation_class_id_fkey` FOREIGN KEY (`class_id`) REFERENCES `class`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_record` ADD CONSTRAINT `leave_record_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `student`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_record` ADD CONSTRAINT `leave_record_applicant_id_fkey` FOREIGN KEY (`applicant_id`) REFERENCES `teacher`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_record` ADD CONSTRAINT `leave_record_approver_id_fkey` FOREIGN KEY (`approver_id`) REFERENCES `teacher`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notice` ADD CONSTRAINT `notice_publisher_id_fkey` FOREIGN KEY (`publisher_id`) REFERENCES `teacher`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notice_read` ADD CONSTRAINT `notice_read_notice_id_fkey` FOREIGN KEY (`notice_id`) REFERENCES `notice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notice_read` ADD CONSTRAINT `notice_read_teacher_id_fkey` FOREIGN KEY (`teacher_id`) REFERENCES `teacher`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task` ADD CONSTRAINT `task_assignee_id_fkey` FOREIGN KEY (`assignee_id`) REFERENCES `teacher`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task` ADD CONSTRAINT `task_creator_id_fkey` FOREIGN KEY (`creator_id`) REFERENCES `teacher`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timeline_event` ADD CONSTRAINT `timeline_event_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `student`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timeline_event` ADD CONSTRAINT `timeline_event_operator_id_fkey` FOREIGN KEY (`operator_id`) REFERENCES `teacher`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timeline_event` ADD CONSTRAINT `timeline_event_leave_record_id_fkey` FOREIGN KEY (`leave_record_id`) REFERENCES `leave_record`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timeline_event` ADD CONSTRAINT `timeline_event_notice_id_fkey` FOREIGN KEY (`notice_id`) REFERENCES `notice`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permission` ADD CONSTRAINT `role_permission_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permission` ADD CONSTRAINT `role_permission_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `permission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

