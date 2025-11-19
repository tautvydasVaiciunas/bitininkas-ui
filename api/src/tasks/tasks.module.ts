import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ActivityLogModule } from '../activity-log/activity-log.module';
import { AssignmentsModule } from '../assignments/assignments.module';
import { Template } from '../templates/template.entity';
import { TemplateStep } from '../templates/template-step.entity';
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
  imports: [
    TypeOrmModule.forFeature([Task, TaskStep, Tag, Template, TemplateStep]),
    ActivityLogModule,
    AssignmentsModule,
  ],
  providers: [TasksService, TaskStepsService, TagsService],
  controllers: [TasksController, TaskStepsController, StepsController, TagsController],
  exports: [TasksService, TaskStepsService, TagsService],
})
export class TasksModule {}
