import { IsInt, IsOptional, IsUUID } from 'class-validator';

export class TemplateStepInputDto {
  @IsUUID()
  taskStepId!: string;

  @IsOptional()
  @IsInt()
  orderIndex?: number;
}
