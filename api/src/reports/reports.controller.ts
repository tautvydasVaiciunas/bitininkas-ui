import { Controller, Get, Query, Request } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('reports')
@Roles(UserRole.MANAGER, UserRole.ADMIN)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('assignments')
  async assignmentProgress(
    @Query('groupId') groupId: string | undefined,
    @Query('taskId') taskId: string | undefined,
    @Request() req,
  ) {
    return this.reportsService.groupAssignmentProgress(groupId, taskId, req.user);
  }
}
