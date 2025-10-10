import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProgressDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  evidenceUrl?: string;
}
