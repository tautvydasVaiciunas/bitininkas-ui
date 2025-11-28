import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Assignment } from '../assignments/assignment.entity';
import { Task } from '../tasks/task.entity';
import { GroupsModule } from '../groups/groups.module';

@Module({
  imports: [TypeOrmModule.forFeature([Assignment, Task]), GroupsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
