import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsUUID, ValidateNested } from 'class-validator';

class TemplateStepOrderDto {
  @IsUUID()
  id!: string;

  @IsInt()
  orderIndex!: number;
}

export class ReorderTemplateStepsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TemplateStepOrderDto)
  steps!: TemplateStepOrderDto[];
}
