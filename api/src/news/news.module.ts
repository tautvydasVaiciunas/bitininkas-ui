import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NewsPost } from './news-post.entity';
import { NewsService } from './news.service';
import { NewsController } from './news.controller';
import { AdminNewsController } from './admin-news.controller';
import { Group } from '../groups/group.entity';
import { GroupMember } from '../groups/group-member.entity';
import { User } from '../users/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { AssignmentsModule } from '../assignments/assignments.module';
import { EmailModule } from '../email/email.module';
import { Task } from '../tasks/task.entity';
import { Hive } from '../hives/hive.entity';
import { Template } from '../templates/template.entity';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NewsPost, Group, GroupMember, User, Task, Hive, Template]),
    NotificationsModule,
    EmailModule,
    AssignmentsModule,
    TasksModule,
  ],
  controllers: [NewsController, AdminNewsController],
  providers: [NewsService],
  exports: [NewsService],
})
export class NewsModule {}
