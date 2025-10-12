import { IsEnum, IsOptional, IsUUID } from 'class-validator';

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
}
