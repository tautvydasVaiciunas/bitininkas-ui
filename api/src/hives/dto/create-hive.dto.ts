import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { HiveStatus } from '../hive.entity';

export class CreateHiveDto {
  @IsString()
  @MaxLength(150)
  label: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
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
