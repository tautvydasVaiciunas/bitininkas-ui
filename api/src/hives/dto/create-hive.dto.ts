import { IsArray, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { HiveStatus } from '../hive.entity';

export class CreateHiveDto {
  @IsString()
  label: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  queenYear?: number;

  @IsOptional()
  @IsEnum(HiveStatus)
  status?: HiveStatus;

  @IsOptional()
  @IsString()
  ownerUserId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  members?: string[];
}
