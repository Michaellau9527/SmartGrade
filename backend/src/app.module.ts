import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

import { PrismaModule } from './common/prisma';
import { envValidationSchema } from './common/config';
import { JwtAuthGuard, RolesGuard, PermissionsGuard, DataScopeGuard } from './common/guards';

import { HealthModule } from './modules/health';
import { AuthModule } from './modules/auth/auth.module';
import { RoleModule } from './modules/role/role.module';
import { PermissionModule } from './modules/permission/permission.module';
import { TeacherModule } from './modules/teacher/teacher.module';
import { StudentModule } from './modules/student/student.module';
import { LeaveModule } from './modules/leave/leave.module';
import { NoticeModule } from './modules/notice/notice.module';
import { DocumentModule } from './modules/document/document.module';
import { TodoModule } from './modules/todo/todo.module';
import { TimelineModule } from './modules/timeline/timeline.module';
import { IncidentModule } from './modules/incident/incident.module';
import { DormModule } from './modules/dorm/dorm.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { ConfigModule as AppConfigModule } from './modules/config/config.module';
import { UploadModule } from './modules/upload/upload.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { WorkbenchModule } from './modules/workbench/workbench.module';

@Module({
  imports: [
    // 环境变量配置 + Joi 验证
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../.env', '.env'],
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),

    // 数据库连接 (全局模块)
    PrismaModule,

    // API 限流
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

    // 定时任务
    ScheduleModule.forRoot(),

    // 基础设施模块
    HealthModule,
    AuthModule,

    // 权限系统模块
    RoleModule,
    PermissionModule,

    // 业务模块 (Phase 骨架)
    TeacherModule,
    StudentModule,
    LeaveModule,
    NoticeModule,
    DocumentModule,
    TodoModule,
    TimelineModule,
    IncidentModule,
    DormModule,
    StatisticsModule,
    AppConfigModule,
    UploadModule,
    SchedulerModule,
    WorkbenchModule,
  ],
  providers: [
    // 全局 Guard 执行顺序（providers 注册顺序即执行顺序）：
    // 1. ThrottlerGuard      - API 限流，100次/分钟
    // 2. JwtAuthGuard        - JWT 认证，验证 Bearer Token（@Public 可跳过）
    // 3. RolesGuard          - 角色验证，检查 @Roles() 要求（管理员自动通过）
    // 4. PermissionsGuard   - 权限验证，检查 @RequirePermissions() 要求（管理员自动通过）
    // 5. DataScopeGuard      - 数据权限，计算 @DataScope() 标记接口的数据范围
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: DataScopeGuard },
  ],
})
export class AppModule {}
