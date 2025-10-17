import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class TemplateStepWithOrderDto {
  @IsUUID('4', { message: 'Žingsnio ID turi būti teisingas UUID' })
  stepId!: string;

  @IsOptional()
  @IsInt({ message: 'Eilės numeris turi būti sveikas skaičius' })
  @Min(1, { message: 'Eilės numeris turi būti teigiamas' })
  order?: number;
}
