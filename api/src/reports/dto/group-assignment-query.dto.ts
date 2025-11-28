import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';

export type GroupAssignmentStatus = 'all' | 'waiting' | 'active' | 'overdue' | 'completed';

export class GroupAssignmentQueryDto {
  @IsUUID('4', { message: 'Neteisingas grupės identifikatorius' })
  groupId!: string;

  @IsOptional()
  @IsUUID('4', { message: 'Neteisingas uÅ¾duoties identifikatorius' })
  taskId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Neteisingas avilio identifikatorius' })
  hiveId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Neteisingas vartotojo identifikatorius' })
  userId?: string;

  @IsOptional()
  @IsDateString(undefined, { message: 'Neteisingas datos formatas' })
  dateFrom?: string;

  @IsOptional()
  @IsDateString(undefined, { message: 'Neteisingas datos formatas' })
  dateTo?: string;

  @IsOptional()
  @IsIn(['all', 'waiting', 'active', 'overdue', 'completed'], {
    message: 'Neteisingas būsenos pasirinkimas',
  })
  status?: GroupAssignmentStatus;
}
