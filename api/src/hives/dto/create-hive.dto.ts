import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { HiveStatus } from '../hive.entity';

export class CreateHiveDto {
  @IsString()
  @IsNotEmpty()
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
