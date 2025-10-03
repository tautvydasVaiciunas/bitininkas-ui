import { Body, Controller, Get, Param, Patch, Post, Query, Request } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { ReorderStepsDto } from './steps/dto/reorder-steps.dto';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateTaskDto, @Request() req) {
    return this.tasksService.create(dto, req.user);
  }

  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('frequency') frequency?: string,
    @Query('seasonMonth') seasonMonth?: string,
  ) {
    return this.tasksService.findAll({
      category,
      frequency: frequency as any,
      seasonMonth: seasonMonth ? parseInt(seasonMonth, 10) : undefined,
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

  @Get(':id/steps')
  getSteps(@Param('id') id: string) {
    return this.tasksService.getSteps(id);
  }

  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @Post(':id/steps/reorder')
  reorder(@Param('id') id: string, @Body() dto: ReorderStepsDto, @Request() req) {
    return this.tasksService.reorderSteps(id, dto, req.user);
  }
}
