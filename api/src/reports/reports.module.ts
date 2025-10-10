import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { GroupMember } from '../groups/group-member.entity';
import { Task } from '../tasks/task.entity';
import { GroupsModule } from '../groups/groups.module';

@Module({
  imports: [TypeOrmModule.forFeature([GroupMember, Task]), GroupsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
