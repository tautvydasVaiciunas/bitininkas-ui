import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class TemplateStepInputDto {
  @IsUUID('4', { message: 'Žingsnio ID turi būti teisingas UUID' })
  taskStepId!: string;

  @IsOptional()
  @IsInt({ message: 'Eilės numeris turi būti sveikas skaičius' })
  @Min(1, { message: 'Eilės numeris turi būti teigiamas' })
  orderIndex?: number;
}
