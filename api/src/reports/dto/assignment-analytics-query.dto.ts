import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, Max, Min } from 'class-validator';

export type AssignmentAnalyticsStatus = 'all' | 'waiting' | 'active' | 'completed' | 'overdue';

export class AssignmentAnalyticsQueryDto {
  @IsOptional()
  @IsISO8601({}, { message: 'Neteisinga data' })
  dateFrom?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'Neteisinga data' })
  dateTo?: string;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsOptional()
  @IsEnum(['all', 'waiting', 'active', 'completed', 'overdue'])
  status?: AssignmentAnalyticsStatus;

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(100)
  limit?: number;
}
