import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HiveEvent } from './hive-event.entity';
import { Hive } from './hive.entity';
import { User } from '../users/user.entity';
import { HiveEventsService } from './hive-events.service';

@Module({
  imports: [TypeOrmModule.forFeature([HiveEvent, Hive, User])],
  providers: [HiveEventsService],
  exports: [HiveEventsService],
})
export class HiveEventsModule {}
