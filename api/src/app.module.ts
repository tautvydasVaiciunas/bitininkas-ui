import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

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

import ormConfig from './typeorm.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        // Nest Throttler v5 schema
        throttlers: [
          {
            ttl: Number(config.get('THROTTLE_TTL') ?? 10),
            limit: Number(config.get('THROTTLE_LIMIT') ?? 100),
          },
        ],
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: ormConfig,
    }),
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
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
