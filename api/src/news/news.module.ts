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

@Module({
  imports: [
    TypeOrmModule.forFeature([NewsPost, Group, GroupMember, User]),
    NotificationsModule,
  ],
  controllers: [NewsController, AdminNewsController],
  providers: [NewsService],
  exports: [NewsService],
})
export class NewsModule {}
