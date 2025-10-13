import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

import { AssignmentStatus } from '../assignment.entity';
import { IsDateOnlyString } from '../../common/validators/is-date-only-string.decorator';

export class CreateAssignmentDto {
  @IsString()
  @IsUUID()
  hiveId!: string;

  @IsString()
  @IsUUID()
  taskId!: string;

  @IsDateOnlyString({ message: 'Pabaigos data turi būti formato YYYY-MM-DD' })
  dueDate!: string;

  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus;

  @IsOptional()
  @IsDateOnlyString({ message: 'Pradžios data turi būti formato YYYY-MM-DD' })
  startDate?: string;
}
