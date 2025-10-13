import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';

import { AssignmentStatus } from '../assignment.entity';

export class ListAssignmentsQueryDto {
  @IsOptional()
  @IsUUID()
  hiveId?: string;

  @IsOptional()
  @IsEnum(AssignmentStatus, {
    message: 'status must be one of not_started, in_progress, done',
  })
  status?: AssignmentStatus;

  @IsOptional()
  @IsUUID()
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
  @IsBoolean()
  availableNow?: boolean;
}
