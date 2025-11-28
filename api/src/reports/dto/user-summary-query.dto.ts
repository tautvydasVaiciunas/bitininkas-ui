import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { AssignmentAnalyticsStatus } from './assignment-analytics-query.dto';

export class UserSummaryQueryDto {
  @Matches(/^\d{4}$/, { message: 'Metų formatas turi būti YYYY' })
  year!: string;

  @IsOptional()
  @IsString({ message: 'Neteisingas grupės identifikatorius' })
  groupId?: string;

  @IsOptional()
  @IsString({ message: 'Neteisingas vartotojo identifikatorius' })
  userId?: string;

  @IsOptional()
  @IsEnum(['all', 'waiting', 'active', 'completed', 'overdue'])
  status?: AssignmentAnalyticsStatus;
}
