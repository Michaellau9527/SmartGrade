-- Migration 0002: add WeChat openid / unionid to teacher (P0-1 真实身份认证)
-- 替代写死的 mock 登录（T001），改为 wx.login -> jscode2session -> 绑定教师 -> 签发 JWT。

ALTER TABLE `teacher`
  ADD COLUMN `wechat_openid`  VARCHAR(100) NULL,
  ADD COLUMN `wechat_unionid` VARCHAR(100) NULL;

-- wechat_openid 唯一：一个微信账号只能绑定一位教师（NULL 表示未绑定，允许多个 NULL）
ALTER TABLE `teacher` ADD UNIQUE KEY `teacher_wechat_openid_key` (`wechat_openid`);
