import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { ProfileController } from './profile.controller';
import { User } from './user.entity';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { PasswordResetModule } from '../auth/password-reset.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), ActivityLogModule, PasswordResetModule],
  providers: [UsersService],
  controllers: [UsersController, ProfileController],
  exports: [UsersService],
})
export class UsersModule {}
