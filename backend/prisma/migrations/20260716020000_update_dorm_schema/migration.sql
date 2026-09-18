-- Phase 5 Dorm 模块 Schema 更新
-- 1. Dormitory 添加 floors / manager_teacher_id
-- 2. DormRoom 添加 current_count / status，重命名 floor_no → floor，capacity 默认改为 4

-- Dormitory 更新
ALTER TABLE "Dormitory" ADD COLUMN "floors" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "Dormitory" ADD COLUMN "manager_teacher_id" BIGINT;
ALTER TABLE "Dormitory" ADD CONSTRAINT "Dormitory_manager_teacher_id_fkey"
    FOREIGN KEY ("manager_teacher_id") REFERENCES "Teacher"("id");
CREATE INDEX "Dormitory_manager_teacher_id_idx" ON "Dormitory"("manager_teacher_id");

-- DormRoom 更新
ALTER TABLE "DormRoom" RENAME COLUMN "floor_no" TO "floor";
ALTER TABLE "DormRoom" ALTER COLUMN "capacity" SET DEFAULT 4;
ALTER TABLE "DormRoom" ADD COLUMN "current_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "DormRoom" ADD COLUMN "status" VARCHAR(20) NOT NULL DEFAULT 'NORMAL';
CREATE INDEX "DormRoom_floor_idx" ON "DormRoom"("floor");
