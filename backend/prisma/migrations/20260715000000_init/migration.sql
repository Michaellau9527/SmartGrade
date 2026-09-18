-- SmartGrade Phase 1 初始迁移
-- 创建 13 张核心表
-- 参考文档: docs/08-Database.md

-- ==================== 枚举类型 ====================

CREATE TYPE "StudentStatus" AS ENUM ('IN_SCHOOL', 'PENDING_LEAVE', 'LEFT_SCHOOL');

CREATE TYPE "BoardingType" AS ENUM ('DAY', 'BOARDING');

CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'LEFT', 'FINISHED', 'CANCELLED');

CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

CREATE TYPE "TodoStatus" AS ENUM ('TODO', 'PROCESSING', 'DONE', 'CANCELLED');

CREATE TYPE "EventType" AS ENUM ('LEAVE_APPLY', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_CANCELLED', 'LEFT_SCHOOL', 'RETURN_SCHOOL', 'CHECKOUT_DORM', 'CHECKIN_DORM', 'DORM_EXCEPTION', 'NOTICE_PUSH', 'TODO_CREATED', 'SYSTEM');

-- ==================== DB-001 Teacher ====================

CREATE TABLE "Teacher" (
    "id" BIGSERIAL NOT NULL,
    "teacher_no" VARCHAR(20) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "gender" "Gender" NOT NULL,
    "phone" VARCHAR(20),
    "email" VARCHAR(100),
    "wechat_openid" VARCHAR(100),
    "avatar" VARCHAR(255),
    "department" VARCHAR(100),
    "position" VARCHAR(100),
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Teacher_teacher_no_key" ON "Teacher"("teacher_no");
CREATE UNIQUE INDEX "Teacher_wechat_openid_key" ON "Teacher"("wechat_openid");
CREATE INDEX "Teacher_status_idx" ON "Teacher"("status");

-- ==================== DB-002 Role ====================

CREATE TABLE "Role" (
    "id" BIGSERIAL NOT NULL,
    "role_code" VARCHAR(50) NOT NULL,
    "role_name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Role_role_code_key" ON "Role"("role_code");

-- ==================== DB-003 TeacherRole ====================

CREATE TABLE "TeacherRole" (
    "id" BIGSERIAL NOT NULL,
    "teacher_id" BIGINT NOT NULL,
    "role_id" BIGINT NOT NULL,

    CONSTRAINT "TeacherRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeacherRole_teacher_id_role_id_key" ON "TeacherRole"("teacher_id", "role_id");
CREATE INDEX "TeacherRole_role_id_idx" ON "TeacherRole"("role_id");

ALTER TABLE "TeacherRole" ADD CONSTRAINT "TeacherRole_teacher_id_fkey"
    FOREIGN KEY ("teacher_id") REFERENCES "Teacher"("id") ON DELETE CASCADE;
ALTER TABLE "TeacherRole" ADD CONSTRAINT "TeacherRole_role_id_fkey"
    FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE CASCADE;

-- ==================== DB-004 Tag ====================

CREATE TABLE "Tag" (
    "id" BIGSERIAL NOT NULL,
    "tag_code" VARCHAR(50) NOT NULL,
    "tag_name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tag_tag_code_key" ON "Tag"("tag_code");

-- ==================== DB-005 TeacherTag ====================

CREATE TABLE "TeacherTag" (
    "id" BIGSERIAL NOT NULL,
    "teacher_id" BIGINT NOT NULL,
    "tag_id" BIGINT NOT NULL,

    CONSTRAINT "TeacherTag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeacherTag_teacher_id_tag_id_key" ON "TeacherTag"("teacher_id", "tag_id");
CREATE INDEX "TeacherTag_tag_id_idx" ON "TeacherTag"("tag_id");

ALTER TABLE "TeacherTag" ADD CONSTRAINT "TeacherTag_teacher_id_fkey"
    FOREIGN KEY ("teacher_id") REFERENCES "Teacher"("id") ON DELETE CASCADE;
ALTER TABLE "TeacherTag" ADD CONSTRAINT "TeacherTag_tag_id_fkey"
    FOREIGN KEY ("tag_id") REFERENCES "Tag"("id") ON DELETE CASCADE;

-- ==================== DB-006 Grade ====================

CREATE TABLE "Grade" (
    "id" BIGSERIAL NOT NULL,
    "grade_name" VARCHAR(50) NOT NULL,
    "grade_code" VARCHAR(20) NOT NULL,
    "director_teacher_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Grade_grade_code_key" ON "Grade"("grade_code");
CREATE UNIQUE INDEX "Grade_director_teacher_id_key" ON "Grade"("director_teacher_id");

ALTER TABLE "Grade" ADD CONSTRAINT "Grade_director_teacher_id_fkey"
    FOREIGN KEY ("director_teacher_id") REFERENCES "Teacher"("id");

-- ==================== DB-007 Class ====================

CREATE TABLE "Class" (
    "id" BIGSERIAL NOT NULL,
    "grade_id" BIGINT NOT NULL,
    "class_name" VARCHAR(20) NOT NULL,
    "head_teacher_id" BIGINT,
    "student_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Class_head_teacher_id_key" ON "Class"("head_teacher_id");
CREATE INDEX "Class_grade_id_idx" ON "Class"("grade_id");

ALTER TABLE "Class" ADD CONSTRAINT "Class_grade_id_fkey"
    FOREIGN KEY ("grade_id") REFERENCES "Grade"("id");
ALTER TABLE "Class" ADD CONSTRAINT "Class_head_teacher_id_fkey"
    FOREIGN KEY ("head_teacher_id") REFERENCES "Teacher"("id");

-- ==================== DB-008 Student ====================

CREATE TABLE "Student" (
    "id" BIGSERIAL NOT NULL,
    "student_no" VARCHAR(30) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "gender" "Gender" NOT NULL,
    "class_id" BIGINT NOT NULL,
    "boarding_type" "BoardingType" NOT NULL,
    "dorm_room_id" BIGINT,
    "bed_no" VARCHAR(20),
    "status" "StudentStatus" NOT NULL DEFAULT 'IN_SCHOOL',
    "phone" VARCHAR(20),
    "parent_name" VARCHAR(50),
    "parent_phone" VARCHAR(20),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Student_student_no_key" ON "Student"("student_no");
CREATE INDEX "Student_class_id_idx" ON "Student"("class_id");
CREATE INDEX "Student_status_idx" ON "Student"("status");

ALTER TABLE "Student" ADD CONSTRAINT "Student_class_id_fkey"
    FOREIGN KEY ("class_id") REFERENCES "Class"("id");

-- ==================== DB-009 Dormitory ====================

CREATE TABLE "Dormitory" (
    "id" BIGSERIAL NOT NULL,
    "building_name" VARCHAR(50) NOT NULL,
    "gender" "Gender" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dormitory_pkey" PRIMARY KEY ("id")
);

-- ==================== DB-010 DormRoom ====================

CREATE TABLE "DormRoom" (
    "id" BIGSERIAL NOT NULL,
    "building_id" BIGINT NOT NULL,
    "room_no" VARCHAR(20) NOT NULL,
    "floor_no" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DormRoom_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DormRoom_building_id_room_no_key" ON "DormRoom"("building_id", "room_no");

ALTER TABLE "DormRoom" ADD CONSTRAINT "DormRoom_building_id_fkey"
    FOREIGN KEY ("building_id") REFERENCES "Dormitory"("id");

-- Student -> DormRoom 外键 (延迟添加，因为 DormRoom 在 Student 之后创建)
ALTER TABLE "Student" ADD CONSTRAINT "Student_dorm_room_id_fkey"
    FOREIGN KEY ("dorm_room_id") REFERENCES "DormRoom"("id");

-- ==================== DB-011 LeaveRecord ====================

CREATE TABLE "LeaveRecord" (
    "id" BIGSERIAL NOT NULL,
    "leave_no" VARCHAR(30) NOT NULL,
    "student_id" BIGINT NOT NULL,
    "student_name" VARCHAR(50) NOT NULL,
    "class_id" BIGINT NOT NULL,
    "class_name" VARCHAR(50) NOT NULL,
    "boarding_type" "BoardingType" NOT NULL,
    "dorm_room_id" BIGINT,
    "bed_no" VARCHAR(20),
    "leave_type" VARCHAR(30) NOT NULL,
    "leave_reason" TEXT NOT NULL,
    "remark" TEXT,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "current_node" VARCHAR(30) NOT NULL,
    "apply_teacher_id" BIGINT NOT NULL,
    "apply_teacher_name" VARCHAR(50) NOT NULL,
    "approve_teacher_id" BIGINT,
    "approve_teacher_name" VARCHAR(50),
    "approve_remark" TEXT,
    "approved_at" TIMESTAMP(3),
    "left_at" TIMESTAMP(3),
    "return_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "is_boarding_notice" BOOLEAN NOT NULL DEFAULT false,
    "timeline_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "LeaveRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LeaveRecord_leave_no_key" ON "LeaveRecord"("leave_no");
CREATE INDEX "LeaveRecord_student_id_idx" ON "LeaveRecord"("student_id");
CREATE INDEX "LeaveRecord_status_idx" ON "LeaveRecord"("status");
CREATE INDEX "LeaveRecord_class_id_idx" ON "LeaveRecord"("class_id");
CREATE INDEX "LeaveRecord_created_at_idx" ON "LeaveRecord"("created_at");
CREATE INDEX "LeaveRecord_apply_teacher_id_idx" ON "LeaveRecord"("apply_teacher_id");

ALTER TABLE "LeaveRecord" ADD CONSTRAINT "LeaveRecord_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "Student"("id");
ALTER TABLE "LeaveRecord" ADD CONSTRAINT "LeaveRecord_apply_teacher_id_fkey"
    FOREIGN KEY ("apply_teacher_id") REFERENCES "Teacher"("id");
ALTER TABLE "LeaveRecord" ADD CONSTRAINT "LeaveRecord_approve_teacher_id_fkey"
    FOREIGN KEY ("approve_teacher_id") REFERENCES "Teacher"("id");

-- ==================== DB-012 Timeline ====================
-- Event Sourcing: 只新增，禁止修改，禁止删除，无 updated_at / deleted_at

CREATE TABLE "Timeline" (
    "id" BIGSERIAL NOT NULL,
    "timeline_no" VARCHAR(30) NOT NULL,
    "student_id" BIGINT NOT NULL,
    "leave_record_id" BIGINT,
    "event_type" "EventType" NOT NULL,
    "event_title" VARCHAR(100) NOT NULL,
    "event_description" TEXT,
    "operator_teacher_id" BIGINT,
    "operator_teacher_name" VARCHAR(50),
    "operator_role" VARCHAR(50),
    "target_role" VARCHAR(50),
    "before_status" VARCHAR(30),
    "after_status" VARCHAR(30),
    "event_source" VARCHAR(30) NOT NULL,
    "source_id" BIGINT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "latitude" DECIMAL(10,6),
    "longitude" DECIMAL(10,6),
    "device" VARCHAR(50),
    "ip_address" VARCHAR(50),
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Timeline_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Timeline_timeline_no_key" ON "Timeline"("timeline_no");
CREATE INDEX "Timeline_student_id_idx" ON "Timeline"("student_id");
CREATE INDEX "Timeline_leave_record_id_idx" ON "Timeline"("leave_record_id");
CREATE INDEX "Timeline_created_at_idx" ON "Timeline"("created_at");
CREATE INDEX "Timeline_event_type_idx" ON "Timeline"("event_type");
CREATE INDEX "Timeline_operator_teacher_id_idx" ON "Timeline"("operator_teacher_id");

ALTER TABLE "Timeline" ADD CONSTRAINT "Timeline_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "Student"("id");
ALTER TABLE "Timeline" ADD CONSTRAINT "Timeline_leave_record_id_fkey"
    FOREIGN KEY ("leave_record_id") REFERENCES "LeaveRecord"("id");
ALTER TABLE "Timeline" ADD CONSTRAINT "Timeline_operator_teacher_id_fkey"
    FOREIGN KEY ("operator_teacher_id") REFERENCES "Teacher"("id");

-- ==================== DB-017 Todo ====================

CREATE TABLE "Todo" (
    "id" BIGSERIAL NOT NULL,
    "todo_no" VARCHAR(30) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT,
    "teacher_id" BIGINT NOT NULL,
    "business_type" VARCHAR(30) NOT NULL,
    "business_id" BIGINT,
    "priority" VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    "status" "TodoStatus" NOT NULL DEFAULT 'TODO',
    "deadline" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Todo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Todo_todo_no_key" ON "Todo"("todo_no");
CREATE INDEX "Todo_teacher_id_idx" ON "Todo"("teacher_id");
CREATE INDEX "Todo_status_idx" ON "Todo"("status");

ALTER TABLE "Todo" ADD CONSTRAINT "Todo_teacher_id_fkey"
    FOREIGN KEY ("teacher_id") REFERENCES "Teacher"("id");