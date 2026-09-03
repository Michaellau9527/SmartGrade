-- ============================================================
-- 清理 seed 虚拟学生数据（S2024001 ~ S2024005）
-- 用途：上传真实学生数据后，把 seed 灌进去的 5 条演示数据下线
--
-- ⚠️ 重要：本脚本使用「软删除」（置 deleted_at），不用 DELETE。
--    原因：leave_record 表有 FOREIGN KEY (student_id) REFERENCES student(id)
--          ON DELETE CASCADE —— 物理删除学生会连带删掉该学生的全部请假记录。
--    软删除后：
--      - 小程序列表不再显示（student.service.ts:65 有 where.deletedAt = null）
--      - 历史请假记录完整保留
--      - 随时可回滚（见步骤 3）
--
-- 用法：按顺序执行，先跑步骤 1 预览确认，再决定是否启用步骤 2。
-- ============================================================


-- ---------- 步骤 1：预览（只读，安全，建议先跑这个） ----------
-- 确认即将被下线的学生，以及他们关联了多少条请假记录
SELECT
  s.student_no           AS 学号,
  s.name                 AS 姓名,
  s.phone                AS 手机号,
  s.boarding_type        AS 住宿类型,
  s.deleted_at           AS 当前删除标记,
  (SELECT COUNT(*) FROM leave_record l WHERE l.student_id = s.id) AS 关联请假数
FROM student s
WHERE s.student_no IN ('S2024001','S2024002','S2024003','S2024004','S2024005')
ORDER BY s.student_no;


-- ---------- 步骤 2：软删除（确认预览无误后，手动取消注释再执行） ----------
-- 只影响这 5 条演示数据；真实学生数据不受影响
-- UPDATE student
-- SET deleted_at = NOW()
-- WHERE student_no IN ('S2024001','S2024002','S2024003','S2024004','S2024005')
--   AND deleted_at IS NULL;


-- ---------- 步骤 3：回滚（万一误操作，恢复这 5 条数据的可见性） ----------
-- UPDATE student
-- SET deleted_at = NULL
-- WHERE student_no IN ('S2024001','S2024002','S2024003','S2024004','S2024005')
--   AND deleted_at IS NOT NULL;


-- ---------- 附：核对删除结果 ----------
-- 应返回 5 条且 deleted_at 非空
-- SELECT student_no, name, deleted_at FROM student
-- WHERE student_no IN ('S2024001','S2024002','S2024003','S2024004','S2024005');
