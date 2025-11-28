import { IsOptional, IsString, Matches } from 'class-validator';

export class UserAssignmentsQueryDto {
  @Matches(/^\d{4}$/, { message: 'Metų formatas turi būti YYYY' })
  year!: string;

  @IsOptional()
  @IsString({ message: 'Neteisingas grupės identifikatorius' })
  groupId?: string;

  @IsOptional()
  @IsString({ message: 'Neteisingas vartotojo identifikatorius' })
  userId?: string;

  @IsOptional()
  @IsString({ message: 'Neteisingas užduoties identifikatorius' })
  taskId?: string;

  @IsOptional()
  @Matches(/^(all|waiting|active|completed|overdue)$/, {
    message: 'Neteisingas būsenos pasirinkimas',
  })
  status?: string;
}
