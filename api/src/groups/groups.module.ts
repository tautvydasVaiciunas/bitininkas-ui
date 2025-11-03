import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { Group } from './group.entity';
import { GroupMember } from './group-member.entity';
import { User } from '../users/user.entity';
import { Hive } from '../hives/hive.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Group, GroupMember, User, Hive])],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
