-- SmartGrade Phase 3 增量迁移：权限模型
-- 新增 Permission + RolePermission 两张表
-- 参考文档: docs/10-Permission.md + docs/08-Database.md

-- ==================== Permission 权限表 ====================

CREATE TABLE "Permission" (
    "id" BIGSERIAL NOT NULL,
    "permission_code" VARCHAR(50) NOT NULL,
    "permission_name" VARCHAR(50) NOT NULL,
    "resource" VARCHAR(50) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Permission_permission_code_key" ON "Permission"("permission_code");

-- ==================== RolePermission 角色权限关联表 ====================

CREATE TABLE "RolePermission" (
    "id" BIGSERIAL NOT NULL,
    "role_id" BIGINT NOT NULL,
    "permission_id" BIGINT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RolePermission_role_id_permission_id_key" ON "RolePermission"("role_id", "permission_id");
CREATE INDEX "RolePermission_permission_id_idx" ON "RolePermission"("permission_id");

ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_role_id_fkey"
    FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permission_id_fkey"
    FOREIGN KEY ("permission_id") REFERENCES "Permission"("id") ON DELETE CASCADE;
