import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseFilters,
} from '@nestjs/common';

import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';
import { TaskFrequency } from './task.entity';
import { TaskCreateBadRequestFilter } from './filters/task-create-bad-request.filter';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @Post()
  @UseFilters(TaskCreateBadRequestFilter)
  create(
    @Body() dto: CreateTaskDto,
    @Request()
    req: {
      user: { id: string; role: UserRole };
    },
  ) {
    return this.tasksService.create(dto, req.user);
  }

  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('frequency') frequency?: string,
    @Query('seasonMonth') seasonMonth?: string,
    @Request()
    req: {
      user: { id: string; role: UserRole };
    },
  ) {
    const normalizedFrequency =
      frequency && Object.values(TaskFrequency).includes(frequency as TaskFrequency)
        ? (frequency as TaskFrequency)
        : undefined;
    const parsedSeasonMonth = seasonMonth ? parseInt(seasonMonth, 10) : undefined;
    const normalizedSeasonMonth = Number.isNaN(parsedSeasonMonth) ? undefined : parsedSeasonMonth;

    return this.tasksService.findAll(req.user, {
      category,
      frequency: normalizedFrequency,
      seasonMonth: normalizedSeasonMonth,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @Request() req) {
    return this.tasksService.update(id, dto, req.user);
  }

}
