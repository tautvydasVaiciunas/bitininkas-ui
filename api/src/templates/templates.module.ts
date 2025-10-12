import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ActivityLogModule } from '../activity-log/activity-log.module';
import { TaskStep } from '../tasks/steps/task-step.entity';
import { Template } from './template.entity';
import { TemplateStep } from './template-step.entity';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';

@Module({
  imports: [TypeOrmModule.forFeature([Template, TemplateStep, TaskStep]), ActivityLogModule],
  controllers: [TemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
