import { IsEnum, IsOptional, IsString, Min } from 'class-validator';

export class AdminThreadListDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Min(1)
  limit?: number;

  @IsOptional()
  @Min(1)
  page?: number;
}
