import { IsBoolean, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import type { TaskStepMediaType } from '../steps/task-step.entity';

export class CreateTaskStepInputDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  contentText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  mediaUrl?: string;

  @IsOptional()
  @IsIn(['image', 'video'])
  mediaType?: TaskStepMediaType;

  @IsOptional()
  @IsBoolean()
  requireUserMedia?: boolean;

  @IsOptional()
  @IsNumber()
  orderIndex?: number;
}
