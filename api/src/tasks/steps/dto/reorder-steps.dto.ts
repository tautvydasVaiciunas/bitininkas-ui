import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';

class StepOrderDto {
  @IsUUID('4', { message: 'Žingsnio ID turi būti teisingas UUID' })
  stepId!: string;

  @IsInt({ message: 'Eilės numeris turi būti sveikas skaičius' })
  @Min(1, { message: 'Eilės numeris turi būti teigiamas' })
  orderIndex!: number;
}

export class ReorderStepsDto {
  @IsArray({ message: 'Reikia pateikti žingsnių sąrašą' })
  @ArrayMinSize(1, { message: 'Turi būti bent vienas žingsnis' })
  @ValidateNested({ each: true })
  @Type(() => StepOrderDto)
  steps!: StepOrderDto[];
}
