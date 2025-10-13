import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { HiveStatus } from '../hive.entity';

export class CreateHiveDto {
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'Pavadinimas privalomas' })
  @MinLength(1, { message: 'Pavadinimas privalomas' })
  @MaxLength(150)
  label: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @Type(() => Number)
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

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];
}
