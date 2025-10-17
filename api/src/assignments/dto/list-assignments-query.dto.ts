import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';

import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { AssignmentStatus } from '../assignment.entity';

export class ListAssignmentsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID('4', { message: 'Neteisingas avilio identifikatorius' })
  hiveId?: string;

  @IsOptional()
  @IsEnum(AssignmentStatus, {
    message: 'Statusas turi būti not_started, in_progress arba done',
  })
  status?: AssignmentStatus;

  @IsOptional()
  @IsUUID('4', { message: 'Neteisingas grupės identifikatorius' })
  groupId?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.toLowerCase();
      if (normalized === 'true' || normalized === '1') {
        return true;
      }
      if (normalized === 'false' || normalized === '0') {
        return false;
      }
    }
    return value;
  })
  @IsBoolean({ message: 'Filtras availableNow turi būti loginė reikšmė' })
  availableNow?: boolean;
}
