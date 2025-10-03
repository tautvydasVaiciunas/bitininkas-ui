import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from './assignment.entity';
import { AssignmentsService } from './assignments.service';
import { AssignmentsController } from './assignments.controller';
import { Hive } from '../hives/hive.entity';
import { Task } from '../tasks/task.entity';
import { TaskStep } from '../tasks/steps/task-step.entity';
import { StepProgress } from '../progress/step-progress.entity';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { HivesModule } from '../hives/hives.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Assignment, Hive, Task, TaskStep, StepProgress]),
    ActivityLogModule,
    forwardRef(() => HivesModule),
  ],
  providers: [AssignmentsService],
  controllers: [AssignmentsController],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
