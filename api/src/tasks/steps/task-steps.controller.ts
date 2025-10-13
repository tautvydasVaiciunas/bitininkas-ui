import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Request,
} from '@nestjs/common';

import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../users/user.entity';
import { CreateTaskStepDto } from './dto/create-task-step.dto';
import { UpdateTaskStepDto } from './dto/update-task-step.dto';
import { TaskStepsService } from './task-steps.service';
import { ReorderStepsDto } from './dto/reorder-steps.dto';

@Controller('tasks/:taskId/steps')
export class TaskStepsController {
  constructor(private readonly taskStepsService: TaskStepsService) {}

  @Get()
  findAll(@Param('taskId') taskId: string) {
    return this.taskStepsService.findAll(taskId);
  }

  @Get(':stepId')
  findOne(@Param('taskId') taskId: string, @Param('stepId') stepId: string) {
    return this.taskStepsService.findOne(taskId, stepId);
  }

  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @Post()
  create(
    @Param('taskId') taskId: string,
    @Body() dto: CreateTaskStepDto,
    @Request() req,
  ) {
    return this.taskStepsService.create(taskId, dto, req.user);
  }

  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @Patch(':stepId')
  update(
    @Param('taskId') taskId: string,
    @Param('stepId') stepId: string,
    @Body() dto: UpdateTaskStepDto,
    @Request() req,
  ) {
    return this.taskStepsService.update(taskId, stepId, dto, req.user);
  }

  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @Delete(':stepId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('taskId') taskId: string, @Param('stepId') stepId: string, @Request() req) {
    return this.taskStepsService.remove(taskId, stepId, req.user);
  }

  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @Post('reorder')
  reorder(
    @Param('taskId') taskId: string,
    @Body() dto: ReorderStepsDto,
    @Request() req,
  ) {
    return this.taskStepsService.reorder(taskId, dto.steps, req.user);
  }
}
