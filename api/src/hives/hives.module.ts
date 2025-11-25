import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hive } from './hive.entity';
import { HivesService } from './hives.service';
import { HivesController } from './hives.controller';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { AssignmentsModule } from '../assignments/assignments.module';
import { User } from '../users/user.entity';
import { HiveTag } from './tags/hive-tag.entity';
import { HiveTagsService } from './tags/hive-tags.service';
import { HiveTagsController } from './tags/hive-tags.controller';
import { HiveEventsModule } from './hive-events.module';
import { HiveHistoryController } from './hive-history.controller';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Hive, User, HiveTag]),
    ActivityLogModule,
    HiveEventsModule,
    forwardRef(() => AssignmentsModule),
    NotificationsModule,
    EmailModule,
  ],
  providers: [HivesService, HiveTagsService],
  controllers: [HivesController, HiveTagsController, HiveHistoryController],
  exports: [HivesService, HiveTagsService],
})
export class HivesModule {}
