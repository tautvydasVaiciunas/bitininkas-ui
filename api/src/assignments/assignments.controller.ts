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
import { AssignmentsScheduler } from './assignments.scheduler';
import { AssignmentReviewStatus } from './assignment.entity';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { ReviewAssignmentDto } from './dto/review-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { ListAssignmentsQueryDto } from './dto/list-assignments-query.dto';
import { BulkFromTemplateDto } from './dto/bulk-from-template.dto';
import { SubmitAssignmentRatingDto } from './dto/submit-rating.dto';

@Controller('assignments')
export class AssignmentsController {
  constructor(
    private readonly assignmentsService: AssignmentsService,
    private readonly assignmentsScheduler: AssignmentsScheduler,
  ) {}

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

  @Roles(UserRole.ADMIN)
  @Post('debug/run-reminder')
  async runWeeklyReminderJob() {
    await this.assignmentsScheduler.handleWeeklyReminders();
    return { success: true };
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAssignmentDto, @Request() req) {
    return this.assignmentsService.update(id, dto, req.user);
  }

  @Get(':id/details')
  details(@Param('id') id: string, @Request() req, @Query('userId') userId?: string) {
    return this.assignmentsService.getDetails(id, req.user, userId);
  }

  @Get(':id/preview')
  preview(@Param('id') id: string, @Request() req) {
    return this.assignmentsService.getPreview(id, req.user);
  }

  @Get(':id/run')
  run(@Param('id') id: string, @Request() req) {
    return this.assignmentsService.getForRun(id, req.user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get('review-queue')
  reviewQueue(
    @Query('status') status?: AssignmentReviewStatus | 'all',
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const parsedPage = Number(page);
    const parsedLimit = Number(limit);

    return this.assignmentsService.listReviewQueue({
      status: status ?? AssignmentReviewStatus.PENDING,
      page: Number.isFinite(parsedPage) ? parsedPage : 1,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : 20,
    });
  }

  @Patch(':id/rating')
  submitRating(@Param('id') id: string, @Body() dto: SubmitAssignmentRatingDto, @Request() req) {
    return this.assignmentsService.submitRating(id, dto, req.user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Patch(':id/review')
  review(@Param('id') id: string, @Body() dto: ReviewAssignmentDto, @Request() req) {
    return this.assignmentsService.reviewAssignment(id, dto, req.user);
  }
}
