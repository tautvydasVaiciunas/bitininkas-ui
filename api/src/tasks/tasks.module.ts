import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ActivityLogModule } from '../activity-log/activity-log.module';
import { Task } from './task.entity';
import { TaskStep } from './steps/task-step.entity';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TaskStepsService } from './steps/task-steps.service';
import { TaskStepsController } from './steps/task-steps.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Task, TaskStep]), ActivityLogModule],
  providers: [TasksService, TaskStepsService],
  controllers: [TasksController, TaskStepsController],
  exports: [TasksService, TaskStepsService],
})
export class TasksModule {}
