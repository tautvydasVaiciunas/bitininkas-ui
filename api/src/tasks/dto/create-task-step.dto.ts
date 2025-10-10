import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateTaskStepInputDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  contentText?: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsNumber()
  orderIndex?: number;
}
