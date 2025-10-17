import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

import { AssignmentStatus } from '../assignment.entity';
import { IsDateOnlyString } from '../../common/validators/is-date-only-string.decorator';

export class CreateAssignmentDto {
  @IsString({ message: 'Avilio ID turi būti tekstas' })
  @IsUUID('4', { message: 'Neteisingas avilio identifikatorius' })
  hiveId!: string;

  @IsString({ message: 'Užduoties ID turi būti tekstas' })
  @IsUUID('4', { message: 'Neteisingas užduoties identifikatorius' })
  taskId!: string;

  @IsDateOnlyString({ message: 'Pabaigos data turi būti formato YYYY-MM-DD' })
  dueDate!: string;

  @IsOptional()
  @IsEnum(AssignmentStatus, { message: 'Neteisinga priskyrimo būsena' })
  status?: AssignmentStatus;

  @IsOptional()
  @IsDateOnlyString({ message: 'Pradžios data turi būti formato YYYY-MM-DD' })
  startDate?: string;
}
