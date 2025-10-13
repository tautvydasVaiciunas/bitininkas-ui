import { IsEnum, IsOptional } from 'class-validator';

import { AssignmentStatus } from '../assignment.entity';
import { IsDateOnlyString } from '../../common/validators/is-date-only-string.decorator';

export class UpdateAssignmentDto {
  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus;

  @IsOptional()
  @IsDateOnlyString({ message: 'Pabaigos data turi būti formato YYYY-MM-DD' })
  dueDate?: string;

  @IsOptional()
  @IsDateOnlyString({ message: 'Pradžios data turi būti formato YYYY-MM-DD' })
  startDate?: string;
}
