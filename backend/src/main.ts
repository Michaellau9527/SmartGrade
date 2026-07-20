import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters';
import { TransformInterceptor, LoggingInterceptor } from './common/interceptors';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);

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

  // CORS (开发环境允许所有来源)
  app.enableCors({
    origin: process.env.NODE_ENV === 'development' ? '*' : undefined,
    credentials: true,
  });

  // Swagger 文档 (仅非生产环境)
  if (process.env.NODE_ENV !== 'production') {
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

  // 启动服务
  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`SmartGrade Backend running on: http://localhost:${port}`);
  logger.log(`API Docs: http://localhost:${port}/docs`);
  logger.log(`Health: http://localhost:${port}/health`);
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap();