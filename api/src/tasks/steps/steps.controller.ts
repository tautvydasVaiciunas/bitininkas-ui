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
  Query,
  Request,
} from '@nestjs/common';

import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../users/user.entity';
import { TaskStepsService } from './task-steps.service';
import { UpdateTaskStepDto } from './dto/update-task-step.dto';
import { CreateGlobalTaskStepDto } from './dto/create-global-task-step.dto';

@Controller('steps')
export class StepsController {
  constructor(private readonly taskStepsService: TaskStepsService) {}

  @Get()
  findAll(
    @Query('taskId') taskId?: string,
    @Query('tagId') tagId?: string,
  ) {
    if (taskId) {
      return this.taskStepsService.findAll(taskId, tagId);
    }

    return this.taskStepsService.findAllGlobal(tagId);
  }

  @Get('global')
  findGlobal(@Query('tagId') tagId?: string) {
    return this.taskStepsService.findAllGlobal(tagId);
  }

  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateGlobalTaskStepDto,
    @Request() req: { user: { id: string; role: UserRole } },
  ) {
    return this.taskStepsService.createGlobal(dto, req.user);
  }

  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskStepDto,
    @Request() req: { user: { id: string; role: UserRole } },
  ) {
    return this.taskStepsService.updateGlobal(id, dto, req.user);
  }

  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: { user: { id: string; role: UserRole } }) {
    return this.taskStepsService.removeGlobal(id, req.user);
  }
}
