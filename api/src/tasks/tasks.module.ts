import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ActivityLogModule } from '../activity-log/activity-log.module';
import { Task } from './task.entity';
import { TaskStep } from './steps/task-step.entity';
import { Tag } from './tags/tag.entity';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TaskStepsService } from './steps/task-steps.service';
import { TaskStepsController } from './steps/task-steps.controller';
import { TagsService } from './tags/tags.service';
import { TagsController } from './tags/tags.controller';
import { StepsController } from './steps/steps.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Task, TaskStep, Tag]), ActivityLogModule],
  providers: [TasksService, TaskStepsService, TagsService],
  controllers: [TasksController, TaskStepsController, StepsController, TagsController],
  exports: [TasksService, TaskStepsService, TagsService],
})
export class TasksModule {}
