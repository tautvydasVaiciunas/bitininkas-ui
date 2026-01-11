import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Assignment } from './assignment.entity';
import { AssignmentsService } from './assignments.service';
import { AssignmentsController } from './assignments.controller';
import { Hive } from '../hives/hive.entity';
import { Task } from '../tasks/task.entity';
import { TaskStep } from '../tasks/steps/task-step.entity';
import { AssignmentProgress } from '../progress/assignment-progress.entity';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { HivesModule } from '../hives/hives.module';
import { Group } from '../groups/group.entity';
import { GroupMember } from '../groups/group-member.entity';
import { Template } from '../templates/template.entity';
import { TemplateStep } from '../templates/template-step.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { AssignmentsScheduler } from './assignments.scheduler';
import { Notification } from '../notifications/notification.entity';
import { HiveEventsModule } from '../hives/hive-events.module';
import { EmailModule } from '../email/email.module';
import { AssignmentStepMedia } from './assignment-step-media.entity';
import { AssignmentStepMediaService } from './assignment-step-media.service';
import { AssignmentStepMediaController } from './assignment-step-media.controller';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Assignment,
      Hive,
      Task,
      TaskStep,
      AssignmentProgress,
      Group,
      GroupMember,
      Template,
      TemplateStep,
      Notification,
      AssignmentStepMedia,
    ]),
    ActivityLogModule,
    NotificationsModule,
    HiveEventsModule,
    EmailModule,
    UploadsModule,
    forwardRef(() => HivesModule),
  ],
  providers: [AssignmentsService, AssignmentsScheduler, AssignmentStepMediaService],
  controllers: [AssignmentsController, AssignmentStepMediaController],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
