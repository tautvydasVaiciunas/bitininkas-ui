import { PartialType } from '@nestjs/mapped-types';

import { CreateTaskStepInputDto } from '../../dto/create-task-step.dto';

export class UpdateTaskStepDto extends PartialType(CreateTaskStepInputDto) {}
