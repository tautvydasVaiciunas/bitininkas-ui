import { IsOptional, IsString } from 'class-validator';

export class CompleteStepDto {
  @IsString()
  assignmentId: string;

  @IsString()
  taskStepId: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  evidenceUrl?: string;
}
