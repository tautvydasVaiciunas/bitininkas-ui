import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AddGroupMemberDto } from './dto/add-group-member.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { ListGroupsQueryDto } from './dto/list-groups-query.dto';
import { ListGroupMembersQueryDto } from './dto/list-group-members-query.dto';

@Controller('groups')
@Roles(UserRole.MANAGER, UserRole.ADMIN)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  findAll(@Query() query: ListGroupsQueryDto) {
    return this.groupsService.findAll(query);
  }

  @Post()
  create(@Body() dto: CreateGroupDto, @Request() req) {
    return this.groupsService.create(dto, req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.groupsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGroupDto, @Request() req) {
    return this.groupsService.update(id, dto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.groupsService.remove(id, req.user);
  }

  @Get(':id/members')
  members(
    @Param('id') id: string,
    @Query() query: ListGroupMembersQueryDto,
    @Request() req,
  ) {
    return this.groupsService.getMembers(id, req.user, query);
  }

  @Post(':id/members')
  addMember(@Param('id') id: string, @Body() dto: AddGroupMemberDto, @Request() req) {
    return this.groupsService.addMember(id, dto, req.user);
  }

  @Delete(':id/members/:userId')
  removeMember(@Param('id') id: string, @Param('userId') userId: string, @Request() req) {
    return this.groupsService.removeMember(id, userId, req.user);
  }
}
