import { IsUUID } from 'class-validator';

import { CreateTaskStepDto } from './create-task-step.dto';

export class CreateGlobalTaskStepDto extends CreateTaskStepDto {
  @IsUUID('4', { message: 'Užduoties ID turi būti teisingas UUID' })
  taskId!: string;
}
