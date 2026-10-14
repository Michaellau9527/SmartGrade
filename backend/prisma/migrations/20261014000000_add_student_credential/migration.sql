-- =====================================================================
-- P2-QR 阶段E：学生身份二维码凭证表（student_credential）
--
-- 手工迁移（禁止 prisma migrate dev），Docker 启动时由
-- `prisma migrate deploy` 执行；列类型/索引名与 schema.prisma 严格一致。
--
-- 安全设计：
-- 1. 仅存 SHA-256(token) 的 64 位 hex 哈希（token_hash CHAR(64)），
--    绝不存令牌明文；二维码载荷只含随机令牌，不含任何个人信息。
-- 2. 「单学生至多一条有效凭证」不依赖普通索引实现（MySQL 无部分唯一索引），
--    由服务层在同一事务内「撤销旧有效凭证 + 创建新凭证」保证；
--    (student_id, version) 唯一约束仅作并发补发兜底（冲突即整体回滚）。
-- =====================================================================

-- CreateTable
CREATE TABLE `student_credential` (
    `id` VARCHAR(191) NOT NULL,
    `student_id` VARCHAR(191) NOT NULL,
    `token_hash` CHAR(64) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `revoked_at` DATETIME(3) NULL,
    `revoked_by` VARCHAR(191) NULL,
    `issued_by` VARCHAR(191) NOT NULL,
    `issued_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_verified_at` DATETIME(3) NULL,
    `last_verified_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `student_credential_token_hash_key`(`token_hash`),
    UNIQUE INDEX `student_credential_student_id_version_key`(`student_id`, `version`),
    INDEX `student_credential_student_id_is_active_idx`(`student_id`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `student_credential` ADD CONSTRAINT `student_credential_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
