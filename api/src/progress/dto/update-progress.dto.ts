import { IsOptional, IsString } from 'class-validator';

export class UpdateProgressDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  evidenceUrl?: string;
}
