import { Type } from 'class-transformer';
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
  ValidateNested,
} from 'class-validator';
import { TaskFrequency } from '../task.entity';
import { CreateTaskStepInputDto } from './create-task-step.dto';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsString()
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
  @IsNumber()
  defaultDueDays?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTaskStepInputDto)
  steps?: CreateTaskStepInputDto[];
}
