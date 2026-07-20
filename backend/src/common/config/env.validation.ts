import * as Joi from 'joi';

/**
 * 环境变量验证 Schema
 *
 * 启动时校验所有必需的环境变量，缺失或不合法时直接报错终止
 */
export const envValidationSchema = Joi.object({
  // 运行环境
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  // 服务端口
  PORT: Joi.number().default(3000),

  // API 前缀
  API_PREFIX: Joi.string().default('/api/v1'),

  // 数据库连接 (必填)
  DATABASE_URL: Joi.string()
    .required()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .description('PostgreSQL 数据库连接字符串'),

  // JWT 密钥 (必填)
  JWT_SECRET: Joi.string()
    .required()
    .min(16)
    .description('JWT 签名密钥，至少 16 位'),

  JWT_EXPIRES_IN: Joi.string().default('7d'),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),

  // 微信小程序
  WECHAT_APPID: Joi.string().allow('').default(''),
  WECHAT_SECRET: Joi.string().allow('').default(''),

  // 文件上传
  UPLOAD_DIR: Joi.string().default('./uploads'),
  UPLOAD_MAX_SIZE: Joi.number().default(10485760), // 10MB
});