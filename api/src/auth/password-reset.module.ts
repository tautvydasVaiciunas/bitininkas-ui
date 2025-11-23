import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { PasswordResetToken } from './password-reset-token.entity';
import { PasswordResetService } from './password-reset.service';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { EmailModule } from '../email/email.module';
import { User } from '../users/user.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([PasswordResetToken, User]),
    ActivityLogModule,
    EmailModule,
  ],
  providers: [PasswordResetService],
  exports: [PasswordResetService],
})
export class PasswordResetModule {}
