import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

import { TemplateStepInputDto } from './template-step-input.dto';

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateStepInputDto)
  steps?: TemplateStepInputDto[];
}
