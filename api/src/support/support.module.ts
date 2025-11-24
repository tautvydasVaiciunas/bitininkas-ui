import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportAttachment } from './entities/support-attachment.entity';
import { SupportMessage } from './entities/support-message.entity';
import { SupportThread } from './entities/support-thread.entity';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { SupportAdminController } from './support-admin.controller';
import { SupportUploadController } from './support-upload.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { User } from '../users/user.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SupportThread, SupportMessage, SupportAttachment, User]),
    NotificationsModule,
    EmailModule,
  ],
  providers: [SupportService],
  controllers: [SupportController, SupportAdminController, SupportUploadController],
  exports: [SupportService],
})
export class SupportModule {}
