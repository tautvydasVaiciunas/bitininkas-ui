import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';

import { Task, TaskFrequency } from '../task.entity';
import { TaskStep, type TaskStepMediaType } from './task-step.entity';
import { ActivityLogService } from '../../activity-log/activity-log.service';
import { UserRole } from '../../users/user.entity';
import { CreateTaskStepDto } from './dto/create-task-step.dto';
import { CreateGlobalTaskStepDto } from './dto/create-global-task-step.dto';
import { UpdateTaskStepDto } from './dto/update-task-step.dto';
import { DatabaseErrorContext, runWithDatabaseErrorHandling } from '../../common/errors/database-error.util';
import { Tag } from '../tags/tag.entity';

@Injectable()
export class TaskStepsService {
  private readonly logger = new Logger(TaskStepsService.name);
  private readonly globalTaskTitle = '__GLOBAL_STEP_CONTAINER__';
  private readonly globalTaskCategory = '__internal_global_steps__';
  private globalTaskIdPromise: Promise<string | null> | null = null;

  constructor(
    @InjectRepository(TaskStep)
    private readonly stepsRepository: Repository<TaskStep>,
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectRepository(Tag)
    private readonly tagsRepository: Repository<Tag>,
    private readonly dataSource: DataSource,
    private readonly activityLog: ActivityLogService,
  ) {}

  private getStepsRepository(manager?: EntityManager) {
    return manager ? manager.getRepository(TaskStep) : this.stepsRepository;
  }

  private getTagsRepository(manager?: EntityManager) {
    return manager ? manager.getRepository(Tag) : this.tagsRepository;
  }

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

  private normalizeTagIds(tagIds?: string[] | null) {
    if (!Array.isArray(tagIds)) {
      return [];
    }

    return Array.from(
      new Set(
        tagIds
          .filter((id): id is string => typeof id === 'string')
          .map((id) => id.trim())
          .filter((id) => id.length > 0),
      ),
    );
  }

  private async syncStepTags(
    manager: EntityManager,
    stepId: string,
    tagIds: string[] | null | undefined,
    context: DatabaseErrorContext,
  ) {
    if (tagIds === undefined) {
      return;
    }

    const normalizedIds = this.normalizeTagIds(tagIds);

    if (normalizedIds.length > 0) {
      const existing = await this.getTagsRepository(manager).find({
        where: { id: In(normalizedIds) },
      });

      if (existing.length !== normalizedIds.length) {
        throw new BadRequestException({
          message: context.message,
          details: 'Pasirinkta žymė nerasta',
        });
      }
    }

    await runWithDatabaseErrorHandling(
      async () => {
        const relation = manager.createQueryBuilder().relation(TaskStep, 'tags').of(stepId);
        const currentTags = await relation.loadMany<Tag>();

        const currentIds = currentTags.map((tag) => tag.id);
        const currentSet = new Set(currentIds);
        const nextSet = new Set(normalizedIds);

        const toRemove = currentIds.filter((id) => !nextSet.has(id));
        const toAdd = normalizedIds.filter((id) => !currentSet.has(id));

        if (toRemove.length) {
          await relation.remove(toRemove);
        }

        if (toAdd.length) {
          await relation.add(toAdd);
        }
      },
      context,
    );
  }

  private createBaseQueryBuilder(manager?: EntityManager) {
    return this.getStepsRepository(manager)
      .createQueryBuilder('step')
      .leftJoinAndSelect('step.tags', 'tag');
  }

  private async findGlobalTask(withDeleted = true) {
    const qb = this.tasksRepository.createQueryBuilder('task');

    if (withDeleted) {
      qb.withDeleted();
    }

    qb.where('task.title = :title', { title: this.globalTaskTitle }).andWhere('task.category = :category', {
      category: this.globalTaskCategory,
    });

    return qb.getOne();
  }

  private async ensureGlobalTask(userId: string) {
    const existing = await this.findGlobalTask();
    if (existing) {
      return existing.id;
    }

    const task = this.tasksRepository.create({
      title: this.globalTaskTitle,
      description: null,
      category: this.globalTaskCategory,
      seasonMonths: [],
      frequency: TaskFrequency.ONCE,
      defaultDueDays: 0,
      createdByUserId: userId,
    });

    const saved = await runWithDatabaseErrorHandling(
      () => this.tasksRepository.save(task),
      { message: 'Nepavyko sukurti žingsnio' },
    );
    await runWithDatabaseErrorHandling(
      () => this.tasksRepository.softRemove(saved),
      { message: 'Nepavyko sukurti žingsnio' },
    );

    return saved.id;
  }

  private async getGlobalTaskId(userId?: string) {
    if (!this.globalTaskIdPromise) {
      this.globalTaskIdPromise = (async () => {
        const existing = await this.findGlobalTask();
        if (existing) {
          return existing.id;
        }

        if (!userId) {
          return null;
        }

        return this.ensureGlobalTask(userId);
      })();
    }

    const id = await this.globalTaskIdPromise;

    if (!id && userId) {
      // Re-run with user id to create container if it was previously null
      this.globalTaskIdPromise = this.ensureGlobalTask(userId).then((value) => value);
      return this.globalTaskIdPromise;
    }

    return id;
  }

  private async ensureTaskExists(taskId: string) {
    const task = await this.tasksRepository
      .createQueryBuilder('task')
      .withDeleted()
      .select(['task.id', 'task.title', 'task.category', 'task.deletedAt'])
      .where('task.id = :taskId', { taskId })
      .getOne();

    if (!task) {
      throw new NotFoundException('Užduotis nerasta');
    }

    if (
      task.deletedAt &&
      (task.title !== this.globalTaskTitle || task.category !== this.globalTaskCategory)
    ) {
      throw new NotFoundException('Užduotis nerasta');
    }
  }

  private async getNextOrderIndex(taskId: string, manager?: EntityManager) {
    const repository = this.getStepsRepository(manager);

    const lastStep = await repository.findOne({
      where: { taskId },
      order: { orderIndex: 'DESC' },
    });

    return (lastStep?.orderIndex ?? 0) + 1;
  }

  private getDescriptionValue(dto: { description?: string | null; contentText?: string | null }) {
    if (dto.description !== undefined) {
      return dto.description;
    }

    return dto.contentText;
  }

  private normalizeStepInput(dto: CreateTaskStepDto | UpdateTaskStepDto, fallbackOrder: number) {
    return {
      title: dto.title?.trim(),
      contentText: this.normalizeNullableString(this.getDescriptionValue(dto)),
      mediaUrl: this.normalizeNullableString(dto.mediaUrl),
      mediaType: this.normalizeMediaType(dto.mediaType),
      requireUserMedia: dto.requireUserMedia ?? false,
      orderIndex: dto.orderIndex ?? fallbackOrder,
    };
  }

  private validateOrderSequence(
    payload: { stepId: string; orderIndex: number }[],
    expectedLength: number,
    action: string,
  ) {
    if (payload.length !== expectedLength) {
      throw new BadRequestException({
        message: action,
        details: 'Turi būti pateikti visi žingsniai',
      });
    }

    const indexes = [...payload.map((item) => item.orderIndex)].sort((a, b) => a - b);

    indexes.forEach((value, index) => {
      const expected = index + 1;
      if (value !== expected) {
        throw new BadRequestException({
          message: action,
          details: `Žingsnių eiliškumas turi būti 1..${expectedLength} be praleidimų`,
        });
      }
    });
  }

  async findAll(taskId: string, tagId?: string) {
    await this.ensureTaskExists(taskId);

    const query = this.createBaseQueryBuilder()
      .where('step.taskId = :taskId', { taskId })
      .orderBy('step.orderIndex', 'ASC');

    if (tagId) {
      query.andWhere('tag.id = :tagId', { tagId });
    }

    return query.getMany();
  }

  async findOne(taskId: string, stepId: string, manager?: EntityManager) {
    await this.ensureTaskExists(taskId);
    const step = await this.createBaseQueryBuilder(manager)
      .where('step.id = :stepId', { stepId })
      .andWhere('step.taskId = :taskId', { taskId })
      .getOne();

    if (!step) {
      throw new NotFoundException('Žingsnis nerastas');
    }

    return step;
  }

  async findById(stepId: string, manager?: EntityManager) {
    const step = await this.createBaseQueryBuilder(manager)
      .where('step.id = :stepId', { stepId })
      .getOne();

    if (!step) {
      throw new NotFoundException('Žingsnis nerastas');
    }

    return step;
  }

  async findAllGlobal(tagId?: string) {
    const globalTaskId = await this.getGlobalTaskId();

    if (!globalTaskId) {
      return [];
    }

    const query = this.createBaseQueryBuilder()
      .where('step.taskId = :taskId', { taskId: globalTaskId })
      .orderBy('step.title', 'ASC')
      .addOrderBy('step.createdAt', 'DESC');

    if (tagId) {
      query.andWhere('tag.id = :tagId', { tagId });
    }

    return query.getMany();
  }

  async create(taskId: string, dto: CreateTaskStepDto, user: { id: string; role: UserRole }) {
    this.assertManager(user.role);
    await this.ensureTaskExists(taskId);

    const saved = await runWithDatabaseErrorHandling(
      () =>
        this.dataSource.transaction(async (manager) => {
          const stepsRepo = this.getStepsRepository(manager);
          const fallbackOrder = await this.getNextOrderIndex(taskId, manager);
          const normalized = this.normalizeStepInput(dto, fallbackOrder);
          if (!normalized.title) {
            this.logger.warn('Nepavyko sukurti žingsnio: pavadinimas privalomas');
            throw new BadRequestException({
              message: 'Nepavyko sukurti žingsnio',
              details: 'Pavadinimas privalomas',
            });
          }

          const step = stepsRepo.create({
            ...normalized,
            taskId,
          });

          const created = await stepsRepo.save(step);
          await this.syncStepTags(manager, created.id, dto.tagIds, { message: 'Nepavyko sukurti žingsnio' });

          return created;
        }),
      { message: 'Nepavyko sukurti žingsnio' },
    );

    await this.activityLog.log('task_step_created', user.id, 'task', taskId);
    return this.findOne(taskId, saved.id);
  }

  async update(
    taskId: string,
    stepId: string,
    dto: UpdateTaskStepDto,
    user: { id: string; role: UserRole },
  ) {
    this.assertManager(user.role);

    const saved = await runWithDatabaseErrorHandling(
      () =>
        this.dataSource.transaction(async (manager) => {
          const stepsRepo = this.getStepsRepository(manager);
          const step = await this.findOne(taskId, stepId, manager);
          const shouldUpdateTags = dto.tagIds !== undefined;

          if (dto.title !== undefined) {
            const title = dto.title.trim();
            if (!title) {
              this.logger.warn('Nepavyko atnaujinti žingsnio: pavadinimas privalomas');
              throw new BadRequestException({
                message: 'Nepavyko atnaujinti žingsnio',
                details: 'Pavadinimas privalomas',
              });
            }
            step.title = title;
          }

          if (dto.description !== undefined) {
            step.contentText = this.normalizeNullableString(dto.description);
          } else if (dto.contentText !== undefined) {
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

          const savedStep = await stepsRepo.save(step);

          if (shouldUpdateTags) {
            await this.syncStepTags(manager, savedStep.id, dto.tagIds, { message: 'Nepavyko atnaujinti žingsnio' });
          }

          return savedStep;
        }),
      { message: 'Nepavyko atnaujinti žingsnio' },
    );

    await this.activityLog.log('task_step_updated', user.id, 'task', taskId);
    return this.findOne(taskId, saved.id);
  }

  async createGlobal(dto: CreateGlobalTaskStepDto, user: { id: string; role: UserRole }) {
    this.assertManager(user.role);

    const globalTaskId = await this.getGlobalTaskId(user.id);

    if (!globalTaskId) {
      this.logger.error('Globalių žingsnių konteineris nesukurtas');
      throw new BadRequestException({
        message: 'Nepavyko sukurti žingsnio',
        details: 'Globalių žingsnių konteineris nerastas',
      });
    }

    const saved = await runWithDatabaseErrorHandling(
      () =>
        this.dataSource.transaction(async (manager) => {
          const stepsRepo = this.getStepsRepository(manager);
          const fallbackOrder = await this.getNextOrderIndex(globalTaskId, manager);
          const normalized = this.normalizeStepInput(dto, fallbackOrder);

          if (!normalized.title) {
            this.logger.warn('Nepavyko sukurti žingsnio: pavadinimas privalomas');
            throw new BadRequestException({
              message: 'Nepavyko sukurti žingsnio',
              details: 'Pavadinimas privalomas',
            });
          }

          const step = stepsRepo.create({
            ...normalized,
            taskId: globalTaskId,
          });

          const created = await stepsRepo.save(step);
          await this.syncStepTags(manager, created.id, dto.tagIds, { message: 'Nepavyko sukurti žingsnio' });

          return created;
        }),
      { message: 'Nepavyko sukurti žingsnio' },
    );

    await this.activityLog.log('task_step_created', user.id, 'task', globalTaskId);

    return this.findById(saved.id);
  }

  async updateGlobal(stepId: string, dto: UpdateTaskStepDto, user: { id: string; role: UserRole }) {
    const step = await this.findById(stepId);
    return this.update(step.taskId, stepId, dto, user);
  }

  async removeGlobal(stepId: string, user: { id: string; role: UserRole }) {
    const step = await this.findById(stepId);
    return this.remove(step.taskId, step.id, user);
  }

  async remove(taskId: string, stepId: string, user: { id: string; role: UserRole }) {
    this.assertManager(user.role);
    const step = await this.findOne(taskId, stepId);

    await runWithDatabaseErrorHandling(
      () => this.stepsRepository.remove(step),
      { message: 'Nepavyko ištrinti žingsnio' },
    );

    await this.activityLog.log('task_step_deleted', user.id, 'task', taskId);
    return;
  }

  async reorder(
    taskId: string,
    payload: { stepId: string; orderIndex: number }[],
    user: { id: string; role: UserRole },
  ) {
    this.assertManager(user.role);

    if (!payload.length) {
      throw new BadRequestException({
        message: 'Nepavyko perrikiuoti žingsnių',
        details: 'Sąrašas tuščias',
      });
    }

    const uniqueIds = new Set(payload.map((step) => step.stepId));
    if (uniqueIds.size !== payload.length) {
      throw new BadRequestException({
        message: 'Nepavyko perrikiuoti žingsnių',
        details: 'Yra pasikartojančių žingsnių',
      });
    }

    await this.ensureTaskExists(taskId);

    const steps = await this.stepsRepository.find({ where: { taskId } });
    const stepsMap = new Map(steps.map((step) => [step.id, step] as const));

    for (const item of payload) {
      if (!stepsMap.has(item.stepId)) {
        throw new NotFoundException('Žingsnis nerastas');
      }
    }

    this.validateOrderSequence(payload, steps.length, 'Nepavyko perrikiuoti žingsnių');

    await runWithDatabaseErrorHandling(
      () =>
        this.dataSource.transaction(async (manager) => {
          for (const { stepId, orderIndex } of payload) {
            await manager.update(TaskStep, { id: stepId }, { orderIndex });
          }
        }),
      { message: 'Nepavyko perrikiuoti žingsnių' },
    );

    await this.activityLog.log('task_steps_reordered', user.id, 'task', taskId);
    return this.findAll(taskId);
  }
}
