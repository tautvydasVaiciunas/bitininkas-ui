import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTaskStepInputDto {
  @IsString()
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
  @IsNumber()
  orderIndex?: number;
}
