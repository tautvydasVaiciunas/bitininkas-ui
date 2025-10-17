import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';

import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { ListAssignmentsQueryDto } from './dto/list-assignments-query.dto';
import { BulkFromTemplateDto } from './dto/bulk-from-template.dto';

@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateAssignmentDto, @Request() req) {
    return this.assignmentsService.create(dto, req.user);
  }

  @Get()
  findAll(@Request() req, @Query() query: ListAssignmentsQueryDto) {
    return this.assignmentsService.findAll(query, req.user);
  }

  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @Post('bulk-from-template')
  bulkFromTemplate(@Body() dto: BulkFromTemplateDto, @Request() req) {
    return this.assignmentsService.createBulkFromTemplate(dto, req.user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAssignmentDto, @Request() req) {
    return this.assignmentsService.update(id, dto, req.user);
  }

  @Get(':id/details')
  details(@Param('id') id: string, @Request() req, @Query('userId') userId?: string) {
    return this.assignmentsService.getDetails(id, req.user, userId);
  }
}
