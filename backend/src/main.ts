import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters';
import { TransformInterceptor, LoggingInterceptor } from './common/interceptors';
import { PrismaService } from './common/prisma/prisma.service';

/**
 * 打印 DATABASE_URL 脱敏后的摘要（绝不输出用户名/密码）
 *   mysql://user:pass@host:port/db  ->  mysql://***:***@host:port/db
 */
function maskDatabaseUrl(url: string): string {
  if (!url) return '(empty)';
  try {
    const u = new URL(url);
    u.username = '***';
    u.password = '***';
    // query 里若有 ssl 等参数是安全的，保留
    return u.toString();
  } catch {
    // 非标准 URL，简单隐藏冒号后至 @ 前的内容
    return url.replace(/\/\/([^:@]+):([^@]*)@/g, '//***:***@');
  }
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // ================= 启动阶段日志（一）基础环境 =================
  const nodeEnv = process.env.NODE_ENV || 'development';
  const port = Number(process.env.PORT) || 3000;
  const rawDbUrl = process.env.DATABASE_URL || '';
  const dbUrlPresent = !!rawDbUrl;
  const maskedDbUrl = dbUrlPresent ? maskDatabaseUrl(rawDbUrl) : '(not set)';

  logger.log(`============== SmartGrade Bootstrap ==============`);
  logger.log(`NODE_ENV     : ${nodeEnv}`);
  logger.log(`PORT         : ${port}`);
  logger.log(`DATABASE_URL : ${dbUrlPresent ? 'SET' : 'NOT SET'} (${maskedDbUrl})`);
  logger.log(`API_PREFIX   : ${process.env.API_PREFIX || '/api/v1'}`);
  logger.log(`CORS_ORIGIN  : ${process.env.CORS_ORIGIN || '*'}`);
  logger.log(`==================================================`);

  // ================= 1. 创建 Nest 应用 =================
  const app = await NestFactory.create(AppModule, {
    bufferLogs: false,
  });

  // 安全头
  app.use(helmet());

  // 全局异常过滤器
  app.useGlobalFilters(new AllExceptionsFilter());

  // 全局拦截器 (执行顺序: 日志 -> 响应转换)
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // API 前缀 (health 不加前缀，方便负载均衡探测)
  const apiPrefix = process.env.API_PREFIX || '/api/v1';
  app.setGlobalPrefix(apiPrefix, {
    exclude: ['health', 'health/(.*)'],
  });

  // CORS
  const corsOrigin = process.env.CORS_ORIGIN || '*';
  app.enableCors({
    origin: corsOrigin === '*' ? true : corsOrigin.split(','),
    credentials: true,
  });

  // Swagger 文档 (仅非生产环境)
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('SmartGrade API')
      .setDescription('SmartGrade 智慧年级管理平台 API 文档<br/><br/>统一响应格式：<code>{"code": 0, "message": "success", "data": {}}</code>')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('健康检查', '服务存活、数据库连接检查')
      .addTag('认证', '微信登录、Token 管理')
      .addTag('教师', '教师管理')
      .addTag('学生', '学生管理')
      .addTag('请销假', '请假申请、审批、销假')
      .addTag('通知', '通知发布、阅读')
      .addTag('文件', '文件上传、下载')
      .addTag('待办', '待办管理')
      .addTag('时间轴', '学生事件时间轴')
      .addTag('异常事件', '宿舍异常上报')
      .addTag('数据统计', '各类统计数据')
      .addTag('系统配置', '角色、标签、系统参数')
      .addTag('文件上传', '通用文件上传')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  // ================= 启动阶段日志（二）Prisma 连接结果 =================
  // PrismaService.onModuleInit 会在 app.listen 前（模块初始化阶段）执行
  // 我们在这里再用 app.get 读取它暴露的 isConnected 状态，避免 DB 连接失败导致 Nest 起不来
  const prisma = app.get(PrismaService);
  logger.log(`PrismaService.onModuleInit 已完成，DB 连接状态: ${prisma.isConnected ? 'SUCCESS' : 'NOT CONNECTED（接口调用时会再尝试连接）'}`);

  // ================= 2. 监听端口（无论 DB 状态如何都要先监听，保证 CloudBase 健康检查通过） =================
  await app.listen(port, '0.0.0.0');

  // ================= 启动阶段日志（三）Nest 监听成功 =================
  const baseUrl = `http://0.0.0.0:${port}`;
  logger.log(`============== NestJS Listen Success ==============`);
  logger.log(`SmartGrade Backend running on: ${baseUrl}`);
  logger.log(`Health  : ${baseUrl}/health`);
  logger.log(`API     : ${baseUrl}${apiPrefix}`);
  if (nodeEnv !== 'production') {
    logger.log(`Docs    : ${baseUrl}/docs`);
  }
  logger.log(`Environment : ${nodeEnv}`);
  logger.log(`Prisma DB   : ${prisma.isConnected ? 'OK' : 'DEGRADED（请求时会再尝试连接）'}`);
  logger.log(`===================================================`);
}

bootstrap();