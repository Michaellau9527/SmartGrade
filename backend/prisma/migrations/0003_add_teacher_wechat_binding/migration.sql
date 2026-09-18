-- Migration 0003: add TeacherWechatBinding (P1-13 教师微信绑定)
-- 一次性绑定码 + 审计。token_hash 仅存 SHA-256，绝不存明文绑定码。
--
-- 兼容性约定（必须与生产实际结构一致；生产库由 prisma/init_db.sql 创建，
-- 与 0001/0002 的本地约定存在历史漂移，本 migration 以生产实际为准）：
--   * teacher.id 为 VARCHAR(36) UUID -> teacher_id / admin_id 必须为 VARCHAR(36)
--   * teacher 表字符集 utf8mb4 / utf8mb4_0900_ai_ci
--     -> 本表必须同字符集同排序规则，否则 MySQL 8 建外键报 errno 3780
--   * CynosDB (8.0.30-cynos) 不支持 ADD CONSTRAINT ... FOREIGN KEY IF NOT EXISTS
--     -> 外键语句不得带 IF NOT EXISTS
-- 本 migration 只新增 teacher_wechat_binding，不修改 teacher 或任何其他既有表。

CREATE TABLE IF NOT EXISTS `teacher_wechat_binding` (
  `id`          VARCHAR(30) NOT NULL,
  `token_hash`  VARCHAR(64) NOT NULL,
  `teacher_id`  VARCHAR(36) NOT NULL,
  `admin_id`    VARCHAR(36) NOT NULL,
  `status`      VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  `expires_at`  DATETIME(3) NOT NULL,
  `consumed_at` DATETIME(3) NULL,
  `created_at`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `teacher_wechat_binding_token_hash_key` (`token_hash`),
  KEY `teacher_wechat_binding_teacher_id_idx` (`teacher_id`),
  KEY `teacher_wechat_binding_status_expires_at_idx` (`status`, `expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- teacher_wechat_binding.teacherId -> teacher.id（被绑定教师）
ALTER TABLE `teacher_wechat_binding`
  ADD CONSTRAINT `teacher_wechat_binding_teacher_id_fkey` FOREIGN KEY (`teacher_id`)
  REFERENCES `teacher`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- teacher_wechat_binding.adminId -> teacher.id（发起绑定的管理员）
ALTER TABLE `teacher_wechat_binding`
  ADD CONSTRAINT `teacher_wechat_binding_admin_id_fkey` FOREIGN KEY (`admin_id`)
  REFERENCES `teacher`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
