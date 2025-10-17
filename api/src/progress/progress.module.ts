import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AssignmentProgress } from './assignment-progress.entity';
import { ProgressService } from './progress.service';
import { ProgressController } from './progress.controller';
import { Assignment } from '../assignments/assignment.entity';
import { TaskStep } from '../tasks/steps/task-step.entity';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { Hive } from '../hives/hive.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AssignmentProgress, Assignment, TaskStep, Hive]),
    ActivityLogModule,
  ],
  providers: [ProgressService],
  controllers: [ProgressController],
})
export class ProgressModule {}
