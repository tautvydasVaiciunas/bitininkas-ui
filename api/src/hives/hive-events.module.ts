import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HiveEvent } from './hive-event.entity';
import { Hive } from './hive.entity';
import { User } from '../users/user.entity';
import { HiveEventsService } from './hive-events.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([HiveEvent, Hive, User]), NotificationsModule],
  providers: [HiveEventsService],
  exports: [HiveEventsService],
})
export class HiveEventsModule {}
