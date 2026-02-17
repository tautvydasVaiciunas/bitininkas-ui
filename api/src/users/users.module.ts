import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { ProfileController } from './profile.controller';
import { User } from './user.entity';
import { UserServiceContract } from './user-service-contract.entity';
import { UserServiceContractService } from './user-service-contract.service';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { PasswordResetModule } from '../auth/password-reset.module';
import { EmailModule } from '../email/email.module';
import { UploadsModule } from '../uploads/uploads.module';
import { StoreOrder } from '../store/entities/order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserServiceContract, StoreOrder]),
    ActivityLogModule,
    PasswordResetModule,
    EmailModule,
    UploadsModule,
  ],
  providers: [UsersService, UserServiceContractService],
  controllers: [UsersController, ProfileController],
  exports: [UsersService, UserServiceContractService],
})
export class UsersModule {}
