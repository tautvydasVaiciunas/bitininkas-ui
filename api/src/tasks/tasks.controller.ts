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
import { TasksService } from './tasks.service';
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
      this.logger.debug(`Sukurta užduotis: ${task.id}`);
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
  ) {
    const normalizedFrequency =
      frequency && Object.values(TaskFrequency).includes(frequency as TaskFrequency)
        ? (frequency as TaskFrequency)
        : undefined;
    const parsedSeasonMonth = seasonMonth ? parseInt(seasonMonth, 10) : undefined;
    const normalizedSeasonMonth = Number.isNaN(parsedSeasonMonth) ? undefined : parsedSeasonMonth;

    const tasks = await this.tasksService.findAll(req.user, {
      category,
      frequency: normalizedFrequency,
      seasonMonth: normalizedSeasonMonth,
    });

    if (this.isDevEnvironment()) {
      this.logger.debug(`Grąžinamos ${tasks.length} užduotys`);
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

}
