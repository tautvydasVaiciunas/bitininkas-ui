import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import {
  RATE_LIMIT_TTL_SECONDS,
  RATE_LIMIT_MAX,
} from './common/config/security.config';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { HivesModule } from './hives/hives.module';
import { TasksModule } from './tasks/tasks.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { ProgressModule } from './progress/progress.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ActivityLogModule } from './activity-log/activity-log.module';
import { GroupsModule } from './groups/groups.module';
import { ReportsModule } from './reports/reports.module';
import { TemplatesModule } from './templates/templates.module';
import { MediaModule } from './media/media.module';
import { NewsModule } from './news/news.module';
import { PaginationModule } from './common/pagination/pagination.module';
import { StoreModule } from './store/store.module';
import { DebugModule } from './debug/debug.module';
import { SupportModule } from './support/support.module';

import ormConfig from './typeorm.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const defaultTtl = Number(config.get('THROTTLE_TTL') ?? 60);
        const defaultLimit = Number(config.get('THROTTLE_LIMIT') ?? 300);
        const windowMs = Number(config.get('RATE_LIMIT_WINDOW_MS') ?? RATE_LIMIT_TTL_SECONDS * 1000);
        const sensitiveTtl = Math.max(1, Math.ceil(windowMs / 1000));
        const sensitiveLimit = Number(config.get('RATE_LIMIT_MAX') ?? RATE_LIMIT_MAX);

        return {
          throttlers: [
            {
              name: 'default',
              ttl: Number.isFinite(defaultTtl) && defaultTtl > 0 ? defaultTtl : 60,
              limit: Number.isFinite(defaultLimit) && defaultLimit > 0 ? defaultLimit : 300,
            },
            {
              name: 'sensitive',
              ttl: sensitiveTtl,
              limit: Number.isFinite(sensitiveLimit) && sensitiveLimit > 0 ? sensitiveLimit : RATE_LIMIT_MAX,
            },
          ],
        };
      },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: ormConfig,
    }),
    PaginationModule,
    AuthModule,
    UsersModule,
    HivesModule,
    TasksModule,
    AssignmentsModule,
    ProgressModule,
    NotificationsModule,
    ActivityLogModule,
    GroupsModule,
    ReportsModule,
    TemplatesModule,
    MediaModule,
    NewsModule,
    StoreModule,
    DebugModule,
    SupportModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
