import { Controller, Get, Query, Request } from '@nestjs/common';
import { ReportsService } from './reports.service';
import type {
  AssignmentAnalyticsResponse,
  AssignmentReportRow,
  AssignmentUserSummaryRow,
} from './reports.service';
import { AssignmentAnalyticsQueryDto } from './dto/assignment-analytics-query.dto';
import { GroupAssignmentQueryDto } from './dto/group-assignment-query.dto';
import { UserAssignmentsQueryDto } from './dto/user-assignments-query.dto';
import { UserSummaryQueryDto } from './dto/user-summary-query.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('reports')
@Roles(UserRole.MANAGER, UserRole.ADMIN)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('assignments')
  async assignmentProgress(
    @Query() query: GroupAssignmentQueryDto,
    @Request() req,
  ): Promise<AssignmentReportRow[]> {
    return this.reportsService.groupAssignmentProgress(query, req.user);
  }

  @Get('assignments/analytics')
  async assignmentAnalytics(
    @Query() query: AssignmentAnalyticsQueryDto,
    @Request() req,
  ): Promise<AssignmentAnalyticsResponse> {
    return this.reportsService.assignmentAnalytics(query, req.user);
  }

  @Get('users')
  async userSummary(
    @Query() query: UserSummaryQueryDto,
    @Request() req,
  ): Promise<AssignmentUserSummaryRow[]> {
    return this.reportsService.userSummary(query, req.user);
  }

  @Get('users/assignments')
  async userAssignments(
    @Query() query: UserAssignmentsQueryDto,
    @Request() req,
  ): Promise<AssignmentReportRow[]> {
    return this.reportsService.userAssignments(query, req.user);
  }
}
