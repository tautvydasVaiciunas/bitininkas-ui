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

@Module({
  imports: [
    TypeOrmModule.forFeature([Hive, User, HiveTag]),
    ActivityLogModule,
    HiveEventsModule,
    forwardRef(() => AssignmentsModule),
  ],
  providers: [HivesService, HiveTagsService],
  controllers: [HivesController, HiveTagsController],
  exports: [HivesService, HiveTagsService],
})
export class HivesModule {}
