import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';

class TemplateStepOrderDto {
  @IsUUID('4', { message: 'Šablono žingsnio ID turi būti teisingas UUID' })
  id!: string;

  @IsInt({ message: 'Eilės numeris turi būti sveikas skaičius' })
  @Min(1, { message: 'Eilės numeris turi būti teigiamas' })
  orderIndex!: number;
}

export class ReorderTemplateStepsDto {
  @IsArray({ message: 'Reikia pateikti šablono žingsnių sąrašą' })
  @ArrayMinSize(1, { message: 'Mažiausiai vienas šablono žingsnis privalomas' })
  @ValidateNested({ each: true })
  @Type(() => TemplateStepOrderDto)
  steps!: TemplateStepOrderDto[];
}
