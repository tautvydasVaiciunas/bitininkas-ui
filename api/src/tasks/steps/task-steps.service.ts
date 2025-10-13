import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';

import { Task } from '../task.entity';
import { TaskStep, type TaskStepMediaType } from './task-step.entity';
import { ActivityLogService } from '../../activity-log/activity-log.service';
import { UserRole } from '../../users/user.entity';
import { CreateTaskStepDto } from './dto/create-task-step.dto';
import { UpdateTaskStepDto } from './dto/update-task-step.dto';

@Injectable()
export class TaskStepsService {
  constructor(
    @InjectRepository(TaskStep)
    private readonly stepsRepository: Repository<TaskStep>,
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    private readonly dataSource: DataSource,
    private readonly activityLog: ActivityLogService,
  ) {}

  private assertManager(role: UserRole) {
    if (![UserRole.MANAGER, UserRole.ADMIN].includes(role)) {
      throw new ForbiddenException('Reikia vadybininko arba administratoriaus teisių');
    }
  }

  private normalizeNullableString(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : null;
  }

  private normalizeMediaType(value?: TaskStepMediaType | null) {
    if (!value) {
      return null;
    }

    return value;
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
      const driverError = (error as QueryFailedError & {
        driverError?: { code?: unknown; detail?: unknown; message?: unknown };
      }).driverError ?? {};
      const code = typeof driverError.code === 'string' ? driverError.code : undefined;
      const detailCandidate = driverError.detail ?? driverError.message;
      const detail = typeof detailCandidate === 'string' ? detailCandidate : undefined;
      const column = this.extractColumnName(detail);

      if (code === '23503') {
        throw new BadRequestException(
          `${action}: ${column ? `susijęs laukas „${column}“ nerastas` : 'susijęs įrašas nerastas'}`,
        );
      }

      if (code === '23505') {
        throw new BadRequestException(
          `${action}: ${column ? `laukas „${column}“ dubliuojasi` : 'pasikartojanti reikšmė'}`,
        );
      }

      if (code === '23514') {
        throw new BadRequestException(`${action}: pažeisti duomenų apribojimai`);
      }

      if (code === '23502') {
        throw new BadRequestException(
          `${action}: ${column ? `laukas „${column}“ privalomas` : 'trūksta privalomos reikšmės'}`,
        );
      }

      throw new BadRequestException(`${action}: neteisingi duomenys`);
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

  private async ensureTaskExists(taskId: string) {
    const taskExists = await this.tasksRepository.exist({ where: { id: taskId } });

    if (!taskExists) {
      throw new NotFoundException('Užduotis nerasta');
    }
  }

  private async getNextOrderIndex(taskId: string) {
    const lastStep = await this.stepsRepository.findOne({
      where: { taskId },
      order: { orderIndex: 'DESC' },
    });

    return (lastStep?.orderIndex ?? 0) + 1;
  }

  private normalizeStepInput(dto: CreateTaskStepDto | UpdateTaskStepDto, fallbackOrder: number) {
    return {
      title: dto.title?.trim(),
      contentText: this.normalizeNullableString(dto.contentText),
      mediaUrl: this.normalizeNullableString(dto.mediaUrl),
      mediaType: this.normalizeMediaType(dto.mediaType),
      requireUserMedia: dto.requireUserMedia ?? false,
      orderIndex: dto.orderIndex ?? fallbackOrder,
    };
  }

  async findAll(taskId: string) {
    await this.ensureTaskExists(taskId);
    return this.stepsRepository.find({
      where: { taskId },
      order: { orderIndex: 'ASC' },
    });
  }

  async findOne(taskId: string, stepId: string) {
    await this.ensureTaskExists(taskId);
    const step = await this.stepsRepository.findOne({ where: { id: stepId, taskId } });

    if (!step) {
      throw new NotFoundException('Žingsnis nerastas');
    }

    return step;
  }

  async create(taskId: string, dto: CreateTaskStepDto, user: { id: string; role: UserRole }) {
    this.assertManager(user.role);
    await this.ensureTaskExists(taskId);

    const fallbackOrder = await this.getNextOrderIndex(taskId);
    const normalized = this.normalizeStepInput(dto, fallbackOrder);
    if (!normalized.title) {
      throw new BadRequestException('Nepavyko sukurti žingsnio: pavadinimas privalomas');
    }

    const step = this.stepsRepository.create({
      ...normalized,
      taskId,
    });

    const saved = await this.runWithDatabaseErrorHandling(
      () => this.stepsRepository.save(step),
      'Nepavyko sukurti žingsnio',
    );

    await this.activityLog.log('task_step_created', user.id, 'task', taskId);
    return saved;
  }

  async update(
    taskId: string,
    stepId: string,
    dto: UpdateTaskStepDto,
    user: { id: string; role: UserRole },
  ) {
    this.assertManager(user.role);
    const step = await this.findOne(taskId, stepId);

    if (dto.title !== undefined) {
      const title = dto.title.trim();
      if (!title) {
        throw new BadRequestException('Nepavyko atnaujinti žingsnio: pavadinimas privalomas');
      }
      step.title = title;
    }

    if (dto.contentText !== undefined) {
      step.contentText = this.normalizeNullableString(dto.contentText);
    }

    if (dto.mediaUrl !== undefined) {
      step.mediaUrl = this.normalizeNullableString(dto.mediaUrl);
    }

    if (dto.mediaType !== undefined) {
      step.mediaType = this.normalizeMediaType(dto.mediaType);
    }

    if (dto.requireUserMedia !== undefined) {
      step.requireUserMedia = dto.requireUserMedia;
    }

    if (dto.orderIndex !== undefined) {
      step.orderIndex = dto.orderIndex;
    }

    const saved = await this.runWithDatabaseErrorHandling(
      () => this.stepsRepository.save(step),
      'Nepavyko atnaujinti žingsnio',
    );

    await this.activityLog.log('task_step_updated', user.id, 'task', taskId);
    return saved;
  }

  async remove(taskId: string, stepId: string, user: { id: string; role: UserRole }) {
    this.assertManager(user.role);
    const step = await this.findOne(taskId, stepId);

    await this.runWithDatabaseErrorHandling(
      () => this.stepsRepository.remove(step),
      'Nepavyko ištrinti žingsnio',
    );

    await this.activityLog.log('task_step_deleted', user.id, 'task', taskId);
    return step;
  }

  async reorder(
    taskId: string,
    payload: { stepId: string; orderIndex: number }[],
    user: { id: string; role: UserRole },
  ) {
    this.assertManager(user.role);

    if (!payload.length) {
      throw new BadRequestException('Nepavyko perrikiuoti žingsnių: sąrašas tuščias');
    }

    const uniqueIds = new Set(payload.map((step) => step.stepId));
    if (uniqueIds.size !== payload.length) {
      throw new BadRequestException('Nepavyko perrikiuoti žingsnių: yra pasikartojančių žingsnių');
    }

    await this.ensureTaskExists(taskId);

    const steps = await this.stepsRepository.find({ where: { taskId } });
    const stepsMap = new Map(steps.map((step) => [step.id, step] as const));

    for (const item of payload) {
      if (!stepsMap.has(item.stepId)) {
        throw new NotFoundException('Žingsnis nerastas');
      }
    }

    if (payload.length !== steps.length) {
      throw new BadRequestException('Nepavyko perrikiuoti žingsnių: turi būti pateikti visi žingsniai');
    }

    await this.runWithDatabaseErrorHandling(
      () =>
        this.dataSource.transaction(async (manager) => {
          for (const { stepId, orderIndex } of payload) {
            await manager.update(TaskStep, { id: stepId }, { orderIndex });
          }
        }),
      'Nepavyko perrikiuoti žingsnių',
    );

    await this.activityLog.log('task_steps_reordered', user.id, 'task', taskId);
    return this.findAll(taskId);
  }
}
