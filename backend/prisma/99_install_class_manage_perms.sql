-- ============================================================
-- SmartGrade 班级管理权限增量脚本（2026-10-16）
-- ============================================================
-- 目的：为「班级管理」补齐 4 个权限码并授权，使管理员与年级主任可以
--       新增 / 编辑 / 删除班级（后端 ClassService 强制数据范围校验）。
--
-- 权限矩阵（与 seed.ts / role-permission.map.ts / PermissionCode 一致）：
--   ROLE_ADMIN           : PermissionsGuard 对 ROLE_ADMIN 短路放行 → 全权，
--                          不落库 role_permission（与 seed.ts ROLE_ADMIN: [] 一致）
--   ROLE_GRADE_DIRECTOR  : class:read / class:create / class:update / class:delete
--   ROLE_POLITICAL       : class:read（只读，数据范围 ALL）
--   ROLE_HEADMASTER      : class:read（只读，数据范围 CLASS = 仅本班）
--   ROLE_SUBJECT_TEACHER : 无（直接调用管理接口 → 403）
--
-- 幂等性：全部使用 INSERT IGNORE + SELECT 关联，可重复执行。
-- 执行方式：DMC (dms.tencent.com) → 数据库 → SQL 编辑器 → 整段粘贴 → 执行。
--
-- ⚠️ 说明：**通常无需手工执行本脚本**。生产容器启动时若 RUN_SEED=1，
--    seed.ts 会 upsert 权限并重建 role_permission，本脚本仅为以下场景的兜底：
--    RUN_SEED 未开启 / seed 失败 / 需要在不重启容器的情况下立即补权限。
-- ============================================================

SET NAMES utf8mb4;

-- 1) 新增 4 个班级权限（幂等）
INSERT IGNORE INTO `permission` (`permission_code`, `permission_name`, `resource`, `action`) VALUES
('class:read',   '查看班级', 'class', 'read'),
('class:create', '新增班级', 'class', 'create'),
('class:update', '修改班级', 'class', 'update'),
('class:delete', '删除班级', 'class', 'delete');

-- 2) 年级主任：全部四项（管理本年级班级）
INSERT IGNORE INTO `role_permission` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `role` r, `permission` p
WHERE r.role_code = 'ROLE_GRADE_DIRECTOR'
  AND p.permission_code IN ('class:read','class:create','class:update','class:delete');

-- 3) 政教：只读
INSERT IGNORE INTO `role_permission` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `role` r, `permission` p
WHERE r.role_code = 'ROLE_POLITICAL'
  AND p.permission_code IN ('class:read');

-- 4) 班主任：只读（仅本班，服务层数据范围强制）
INSERT IGNORE INTO `role_permission` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `role` r, `permission` p
WHERE r.role_code = 'ROLE_HEADMASTER'
  AND p.permission_code IN ('class:read');

-- 5) 验证
SELECT '=== 班级权限分布 ===' AS '';
SELECT r.role_code, GROUP_CONCAT(p.permission_code ORDER BY p.permission_code) AS class_perms
FROM `role` r
JOIN `role_permission` rp ON rp.role_id = r.id
JOIN `permission` p ON p.id = rp.permission_id
WHERE p.permission_code LIKE 'class:%'
GROUP BY r.role_code
ORDER BY r.role_code;

SELECT '✅ 班级管理权限增量安装完成（ROLE_ADMIN 由 PermissionsGuard 短路全权，不落库）' AS done;
