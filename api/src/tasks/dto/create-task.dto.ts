import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { TaskFrequency } from '../task.entity';
import { CreateTaskStepInputDto } from './create-task-step.dto';

export class CreateTaskDto {
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'Pavadinimas privalomas' })
  @MinLength(1, { message: 'Pavadinimas privalomas' })
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(1, { each: true })
  @Max(12, { each: true })
  seasonMonths?: number[];

  @IsOptional()
  @IsEnum(TaskFrequency)
  frequency?: TaskFrequency;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  defaultDueDays?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTaskStepInputDto)
  steps?: CreateTaskStepInputDto[];
}
