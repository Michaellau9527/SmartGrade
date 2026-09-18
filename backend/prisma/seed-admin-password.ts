/**
 * 解析 seed 所需的管理员密码（P1-5）。
 *
 * 安全红线：禁止任何硬编码默认弱口令。此前 seed 在 SMARTGRADE_ADMIN_PASSWORD 未设置时
 * 静默回退到 'SmartGrade@2025'，等于给管理员账号留了一个公开后门。
 *
 * 本函数改为 fail-closed：未显式设置（或为空）时直接抛错，由 seed 主流程捕获并以非零码退出，
 * 绝不在任何环境（含生产）写入已知弱口令。
 *
 * 设计为纯函数、无副作用，便于在不连接数据库的情况下单测。
 */
export function resolveAdminPassword(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const pwd = env.SMARTGRADE_ADMIN_PASSWORD;
  if (!pwd || pwd.trim() === '') {
    throw new Error(
      'SMARTGRADE_ADMIN_PASSWORD 未设置：出于安全考虑，seed 已禁止继续使用默认弱口令 ' +
        "'SmartGrade@2025'。请在运行 seed 前显式设置强密码，例如：\n" +
        '  export SMARTGRADE_ADMIN_PASSWORD="$(openssl rand -base64 18)"',
    );
  }
  return pwd;
}
