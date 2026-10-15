-- SmartGrade Phase 4.5 增量迁移：Notice + NoticeRead 通知表
-- 新增 NoticeType、NoticeStatus 枚举 + Notice、NoticeRead 两张表
-- 参考文档: docs/08-Database.md DB-013/DB-014, docs/07-BusinessFlow.md 第七章

-- ==================== 枚举 ====================

CREATE TYPE "NoticeType" AS ENUM ('ALL', 'ROLE', 'TAG', 'ORGANIZATION');

CREATE TYPE "NoticeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'WITHDRAWN');

-- ==================== Notice 通知表 ====================

CREATE TABLE "Notice" (
    "id" BIGSERIAL NOT NULL,
    "notice_no" VARCHAR(30) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "notice_type" "NoticeType" NOT NULL,
    "publisher_teacher_id" BIGINT NOT NULL,
    "publisher_name" VARCHAR(50) NOT NULL,
    "publish_scope" TEXT NOT NULL DEFAULT '{}',
    "priority" VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    "need_confirm" BOOLEAN NOT NULL DEFAULT false,
    "status" "NoticeStatus" NOT NULL DEFAULT 'DRAFT',
    "publish_at" TIMESTAMP(3),
    "expired_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Notice_notice_no_key" ON "Notice"("notice_no");
CREATE INDEX "Notice_publisher_teacher_id_idx" ON "Notice"("publisher_teacher_id");
CREATE INDEX "Notice_status_idx" ON "Notice"("status");
CREATE INDEX "Notice_created_at_idx" ON "Notice"("created_at");

ALTER TABLE "Notice" ADD CONSTRAINT "Notice_publisher_teacher_id_fkey"
    FOREIGN KEY ("publisher_teacher_id") REFERENCES "Teacher"("id");

-- ==================== NoticeRead 通知阅读表 ====================

CREATE TABLE "NoticeRead" (
    "id" BIGSERIAL NOT NULL,
    "notice_id" BIGINT NOT NULL,
    "teacher_id" BIGINT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "confirm_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoticeRead_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NoticeRead_notice_id_teacher_id_key" ON "NoticeRead"("notice_id", "teacher_id");
CREATE INDEX "NoticeRead_notice_id_idx" ON "NoticeRead"("notice_id");
CREATE INDEX "NoticeRead_teacher_id_idx" ON "NoticeRead"("teacher_id");
CREATE INDEX "NoticeRead_is_read_idx" ON "NoticeRead"("is_read");

ALTER TABLE "NoticeRead" ADD CONSTRAINT "NoticeRead_notice_id_fkey"
    FOREIGN KEY ("notice_id") REFERENCES "Notice"("id") ON DELETE CASCADE;
ALTER TABLE "NoticeRead" ADD CONSTRAINT "NoticeRead_teacher_id_fkey"
    FOREIGN KEY ("teacher_id") REFERENCES "Teacher"("id") ON DELETE CASCADE;
