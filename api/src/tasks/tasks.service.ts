import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { Task, TaskFrequency } from './task.entity';
import { TaskStep } from './steps/task-step.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ReorderStepsDto } from './steps/dto/reorder-steps.dto';
import { UserRole } from '../users/user.entity';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { TaskStepsService } from './steps/task-steps.service';

type StepInput = Partial<
  Pick<TaskStep, 'title' | 'contentText' | 'mediaUrl' | 'orderIndex'>
>;

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectRepository(TaskStep)
    private readonly stepsRepository: Repository<TaskStep>,
    private readonly taskStepsService: TaskStepsService,
    private readonly activityLog: ActivityLogService,
  ) {}

  private assertManager(role: UserRole) {
    if (![UserRole.MANAGER, UserRole.ADMIN].includes(role)) {
      throw new ForbiddenException('Requires manager or admin role');
    }
  }

  private normalizeNullableString(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : null;
  }

  private extractColumnName(detail?: string) {
    if (!detail) {
      return undefined;
    }

    const parenMatch = detail.match(/\(([^)]+)\)=/);
    if (parenMatch) {
      return parenMatch[1];
    }

    const columnMatch = detail.match(/column "([^"]+)"/i);
    if (columnMatch) {
      return columnMatch[1];
    }

    return undefined;
  }

  private handleDatabaseError(error: unknown, action: string): never {
    if (error instanceof QueryFailedError) {
      const driverError = (error as QueryFailedError & { driverError?: any }).driverError ?? {};
      const code: string | undefined = driverError.code;
      const detail: string | undefined = driverError.detail ?? driverError.message;
      const column = this.extractColumnName(detail);

      if (code === '23503') {
        throw new UnprocessableEntityException(
          `${action}: ${column ? `${column} not found` : 'related entity missing'}`,
        );
      }

      if (code === '23505') {
        throw new UnprocessableEntityException(
          `${action}: ${column ? `duplicate value for ${column}` : 'duplicate value'}`,
        );
      }

      if (code === '23514') {
        throw new UnprocessableEntityException(`${action}: constraint violated`);
      }

      if (code === '23502') {
        throw new BadRequestException(
          `${action}: ${column ? `${column} is required` : 'missing required value'}`,
        );
      }

      throw new BadRequestException(`${action}: invalid data`);
    }

    throw error;
  }

  private async runWithDatabaseErrorHandling<T>(
    operation: () => Promise<T>,
    action: string,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.handleDatabaseError(error, action);
    }
  }

  private normalizeStepInput(step: StepInput, orderIndex: number): StepInput {
    return {
      ...step,
      title: step.title ? step.title.trim() : step.title,
      contentText: this.normalizeNullableString(step.contentText),
      mediaUrl: this.normalizeNullableString(step.mediaUrl),
      orderIndex,
    };
  }

  async create(dto: CreateTaskDto, user: { id: string; role: UserRole }) {
    this.assertManager(user.role);

    const { steps = [], ...taskData } = dto;

    const task = this.tasksRepository.create({
      title: dto.title.trim(),
      description: this.normalizeNullableString(taskData.description),
      category: this.normalizeNullableString(taskData.category),
      seasonMonths: taskData.seasonMonths ?? [],
      frequency: taskData.frequency ?? TaskFrequency.ONCE,
      defaultDueDays: taskData.defaultDueDays ?? 7,
      createdByUserId: user.id,
      steps: steps.map((step, index) =>
        this.stepsRepository.create(
          this.normalizeStepInput(step, step.orderIndex ?? index + 1),
        ),
      ),
    });

    const saved = await this.runWithDatabaseErrorHandling(
      () => this.tasksRepository.save(task),
      'Unable to create task',
    );
    await this.activityLog.log('task_created', user.id, 'task', saved.id);
    return saved;
  }

  async findAll(query: {
    category?: string;
    frequency?: TaskFrequency;
    seasonMonth?: number;
  }) {
    const qb = this.tasksRepository.createQueryBuilder('task');

    if (query.category) {
      qb.andWhere('task.category = :category', {
        category: query.category,
      });
    }

    if (query.frequency) {
      qb.andWhere('task.frequency = :frequency', {
        frequency: query.frequency,
      });
    }

    if (query.seasonMonth) {
      qb.andWhere(':month = ANY(task.seasonMonths)', {
        month: query.seasonMonth,
      });
    }

    return qb.getMany();
  }

  async findOne(id: string) {
    const task = await this.tasksRepository.findOne({ where: { id } });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async update(id: string, dto: UpdateTaskDto, user: { id: string; role: UserRole }) {
    this.assertManager(user.role);
    const { steps, ...taskData } = dto;
    const task = await this.findOne(id);

    if (taskData.title !== undefined) {
      task.title = taskData.title.trim();
    }

    if (taskData.description !== undefined) {
      task.description = this.normalizeNullableString(taskData.description);
    }

    if (taskData.category !== undefined) {
      task.category = this.normalizeNullableString(taskData.category);
    }

    if (taskData.seasonMonths !== undefined) {
      task.seasonMonths = taskData.seasonMonths;
    }

    if (taskData.frequency !== undefined) {
      task.frequency = taskData.frequency;
    }

    if (taskData.defaultDueDays !== undefined) {
      task.defaultDueDays = taskData.defaultDueDays;
    }

    const saved = await this.runWithDatabaseErrorHandling(
      () => this.tasksRepository.save(task),
      'Unable to update task',
    );

    if (steps) {
      await this.updateSteps(
        id,
        steps.map((step, index) =>
          this.normalizeStepInput(step, step.orderIndex ?? index + 1),
        ),
        user,
      );
    }

    await this.activityLog.log('task_updated', user.id, 'task', id);
    return saved;
  }

  async getSteps(taskId: string) {
    return this.taskStepsService.findAll(taskId);
  }

  async reorderSteps(taskId: string, dto: ReorderStepsDto, user: { id: string; role: UserRole }) {
    return this.taskStepsService.reorder(taskId, dto.steps, user);
  }

  async createSteps(taskId: string, steps: StepInput[]) {
    const existingSteps = await this.getSteps(taskId);
    const maxIndex = existingSteps.reduce(
      (max, step) => Math.max(max, step.orderIndex),
      0,
    );
    let index = maxIndex + 1;

    for (const step of steps) {
      const normalized = this.normalizeStepInput(step, step.orderIndex ?? index++);
      const newStep = this.stepsRepository.create({
        ...normalized,
        taskId,
      });

      await this.runWithDatabaseErrorHandling(
        () => this.stepsRepository.save(newStep),
        'Unable to create task steps',
      );
    }

    return this.getSteps(taskId);
  }

  async updateSteps(taskId: string, steps: StepInput[], user: { id: string; role: UserRole }) {
    this.assertManager(user.role);
    await this.stepsRepository.delete({ taskId });
    let index = 1;

    for (const step of steps) {
      const normalized = this.normalizeStepInput(step, step.orderIndex ?? index++);
      const newStep = this.stepsRepository.create({
        ...normalized,
        taskId,
      });

      await this.runWithDatabaseErrorHandling(
        () => this.stepsRepository.save(newStep),
        'Unable to update task steps',
      );
    }

    await this.activityLog.log('task_steps_updated', user.id, 'task', taskId);
    return this.getSteps(taskId);
  }
}
