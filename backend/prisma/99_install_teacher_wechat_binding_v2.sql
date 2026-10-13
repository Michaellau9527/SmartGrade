-- ============================================================
-- SmartGrade v1.2 — P1-13 教师微信绑定 修复版 DDL / DML
-- 修复日期: 2026-10-12
-- 原因: 之前 5 行 SQL 的 CREATE TABLE 未显式指定 COLLATE,
--       导致 admin_id / teacher_id 列用了数据库默认 collation
--       (utf8mb4_general_ci) 与 teacher.id 的 utf8mb4_unicode_ci 不一致,
--       外键 teacher_wechat_binding_admin_id_fkey 报 3780 错。
-- 修复: 显式指定 utf8mb4_unicode_ci 与 init_db.sql 完全一致。
-- ============================================================

-- 关外键检查（防执行顺序的潜在 FK 报错）
SET FOREIGN_KEY_CHECKS = 0;

-- 0. 先清理有可能残留的 teacher_wechat_binding 半成品表
DROP TABLE IF EXISTS `teacher_wechat_binding`;

-- 1. DB-022 TeacherWechatBinding（P1-13 教师微信绑定一次性绑定码 + 审计）
CREATE TABLE `teacher_wechat_binding` (
  `id`          VARCHAR(36)  NOT NULL,
  `token_hash`  VARCHAR(64)  NOT NULL,
  `teacher_id`  VARCHAR(36)  NOT NULL,
  `admin_id`    VARCHAR(36)  NOT NULL,
  `status`      ENUM('ACTIVE', 'CONSUMED', 'EXPIRED', 'REVOKED') NOT NULL DEFAULT 'ACTIVE',
  `expires_at`  DATETIME(3)  NOT NULL,
  `consumed_at` DATETIME(3)  NULL,
  `created_at`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `teacher_wechat_binding_token_hash_key` (`token_hash`),
  INDEX `teacher_wechat_binding_teacher_id_idx`         (`teacher_id`),
  INDEX `teacher_wechat_binding_status_expires_at_idx`  (`status`, `expires_at`),
  -- 显式 COLLATE utf8mb4_unicode_ci 与 init_db.sql 的 teacher 表完全一致
  CONSTRAINT `teacher_wechat_binding_teacher_id_fkey`
    FOREIGN KEY (`teacher_id`) REFERENCES `teacher` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `teacher_wechat_binding_admin_id_fkey`
    FOREIGN KEY (`admin_id`) REFERENCES `teacher` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 恢复外键检查
SET FOREIGN_KEY_CHECKS = 1;

-- 2. 把 seed 里的 T004 改成工号 007 的刘忠昊（体验者）
UPDATE `teacher` SET `name`='刘忠昊', `teacher_no`='007' WHERE `teacher_no`='T004';

-- 3. 插入一次性绑定码 DEMO_BIND_2026（一年有效期，与 backend 一致）
INSERT INTO `teacher_wechat_binding`
  (`id`, `token_hash`, `teacher_id`, `admin_id`, `status`, `expires_at`, `consumed_at`)
VALUES (
  REPLACE(UUID(),'-',''),
  SHA2('DEMO_BIND_2026', 256),
  (SELECT id FROM teacher WHERE teacher_no='007'),
  (SELECT id FROM teacher WHERE teacher_no='T001'),
  'ACTIVE',
  DATE_ADD(NOW(), INTERVAL 1 YEAR),
  NULL
);

-- 4. 验证：打印老师姓名、绑定码状态
SELECT
  '✅ 完成!' AS result,
  (SELECT name      FROM teacher WHERE teacher_no='007')  AS 体验者,
  (SELECT name      FROM teacher WHERE teacher_no='T001')  AS 绑定管理员,
  (SELECT COUNT(*)  FROM teacher_wechat_binding WHERE status='ACTIVE') AS 有效绑定码数;
