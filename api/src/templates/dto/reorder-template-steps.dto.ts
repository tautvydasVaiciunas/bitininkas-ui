import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';

class TemplateStepOrderDto {
  @IsUUID()
  id!: string;

  @IsInt({ message: 'Eilės numeris turi būti sveikas skaičius' })
  @Min(1, { message: 'Eilės numeris turi būti teigiamas' })
  orderIndex!: number;
}

export class ReorderTemplateStepsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TemplateStepOrderDto)
  steps!: TemplateStepOrderDto[];
}
