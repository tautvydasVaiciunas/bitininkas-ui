import {
  Body,
  Controller,
  Get,
  Logger,
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
import { ArchiveTaskDto } from './dto/archive-task.dto';
import { TaskStatusFilter, TasksService } from './tasks.service';
import { TaskFrequency } from './task.entity';
import { TaskCreateBadRequestFilter } from './filters/task-create-bad-request.filter';

@Controller('tasks')
export class TasksController {
  private readonly logger = new Logger(TasksController.name);

  constructor(private readonly tasksService: TasksService) {}

  private isDevEnvironment() {
    return process.env.NODE_ENV !== 'production';
  }

  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @Post()
  @UseFilters(TaskCreateBadRequestFilter)
  async create(
    @Body() dto: CreateTaskDto,
    @Request()
    req: {
      user: { id: string; role: UserRole };
    },
  ) {
    const task = await this.tasksService.create(dto, req.user);

    if (this.isDevEnvironment()) {
      this.logger.debug('tasks create', { id: task.id });
    }

    return task;
  }

  @Get()
  async findAll(
    @Request()
    req: {
      user: { id: string; role: UserRole };
    },
    @Query('category') category?: string,
    @Query('frequency') frequency?: string,
    @Query('seasonMonth') seasonMonth?: string,
    @Query('status') status?: string,
  ) {
    const normalizedFrequency =
      frequency && Object.values(TaskFrequency).includes(frequency as TaskFrequency)
        ? (frequency as TaskFrequency)
        : undefined;
    const parsedSeasonMonth = seasonMonth ? parseInt(seasonMonth, 10) : undefined;
    const normalizedSeasonMonth = Number.isNaN(parsedSeasonMonth) ? undefined : parsedSeasonMonth;
    const normalizedStatus =
      status && ['archived', 'past', 'all'].includes(status.toLowerCase())
        ? (status.toLowerCase() as TaskStatusFilter)
        : 'active';

    const tasks = await this.tasksService.findAll(req.user, {
      category,
      frequency: normalizedFrequency,
      seasonMonth: normalizedSeasonMonth,
      status: normalizedStatus as TaskStatusFilter,
    });

    if (this.isDevEnvironment()) {
      this.logger.debug('tasks list', { count: tasks.length });
    }

    return tasks;
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

  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @Patch(':id/archive')
  async archive(
    @Param('id') id: string,
    @Body() dto: ArchiveTaskDto,
    @Request()
    req: {
      user: { id: string; role: UserRole };
    },
  ) {
    const archived = dto.archived ?? true;
    await this.tasksService.setArchived(id, archived, req.user);
    return { id, archived };
  }

}
