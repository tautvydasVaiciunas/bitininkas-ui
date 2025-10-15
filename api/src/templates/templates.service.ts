import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, QueryFailedError, Repository } from 'typeorm';

import { ActivityLogService } from '../activity-log/activity-log.service';
import { UserRole } from '../users/user.entity';
import { TaskStep } from '../tasks/steps/task-step.entity';
import { Template } from './template.entity';
import { TemplateStep } from './template-step.entity';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(Template)
    private readonly templateRepository: Repository<Template>,
    @InjectRepository(TemplateStep)
    private readonly templateStepRepository: Repository<TemplateStep>,
    @InjectRepository(TaskStep)
    private readonly taskStepRepository: Repository<TaskStep>,
    private readonly dataSource: DataSource,
    private readonly activityLog: ActivityLogService,
  ) {}

  private assertManager(role: UserRole) {
    if (![UserRole.MANAGER, UserRole.ADMIN].includes(role)) {
      throw new ForbiddenException('Reikia vadybininko arba administratoriaus teisių');
    }
  }

  private normalizeName(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new BadRequestException('Šablono pavadinimas privalomas');
    }

    return trimmed;
  }

  private normalizeComment(value?: string | null) {
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

  private getTemplateRepository(manager?: EntityManager) {
    return manager ? manager.getRepository(Template) : this.templateRepository;
  }

  private getTemplateStepRepository(manager?: EntityManager) {
    return manager ? manager.getRepository(TemplateStep) : this.templateStepRepository;
  }

  private getTaskStepRepository(manager?: EntityManager) {
    return manager ? manager.getRepository(TaskStep) : this.taskStepRepository;
  }

  private async ensureTemplate(id: string, manager?: EntityManager) {
    const repository = this.getTemplateRepository(manager);
    const template = await repository.findOne({
      where: { id },
      relations: { steps: true },
      order: { steps: { orderIndex: 'ASC' } },
    });

    if (!template) {
      throw new NotFoundException('Šablonas nerastas');
    }

    return template;
  }

  private async ensureTaskStepsExist(taskStepIds: string[], manager?: EntityManager) {
    if (!taskStepIds.length) {
      return;
    }

    const repository = this.getTaskStepRepository(manager);
    const found = await repository.find({ where: { id: In(taskStepIds) } });
    if (found.length !== taskStepIds.length) {
      throw new NotFoundException('Žingsnis nerastas');
    }
  }

  private ensureUniqueStepIds(taskStepIds: string[], action: string) {
    const unique = new Set(taskStepIds);
    if (unique.size !== taskStepIds.length) {
      throw new BadRequestException(`${action}: žingsniai neturi kartotis`);
    }
  }

  private validateOrderSequence(orderIndexes: number[], expectedLength: number, action: string) {
    if (orderIndexes.length !== expectedLength) {
      throw new BadRequestException(`${action}: turi būti pateikti visi žingsniai`);
    }

    const sorted = [...orderIndexes].sort((a, b) => a - b);
    sorted.forEach((value, index) => {
      const expected = index + 1;
      if (value !== expected) {
        throw new BadRequestException(
          `${action}: žingsnių eiliškumas turi būti 1..${expectedLength} be praleidimų`,
        );
      }
    });
  }

  private normalizeStepsInput(
    action: string,
    steps?: { taskStepId: string; orderIndex?: number }[],
    stepIds?: string[],
  ) {
    const providedSteps = steps?.length ? steps : undefined;
    const providedIds = !providedSteps && stepIds?.length ? stepIds : undefined;

    if (!providedSteps && !providedIds) {
      return [] as { taskStepId: string; orderIndex: number }[];
    }

    if (providedSteps) {
      const normalized = providedSteps.map((step, index) => ({
        taskStepId: step.taskStepId,
        orderIndex: step.orderIndex ?? index + 1,
      }));
      this.ensureUniqueStepIds(
        normalized.map((step) => step.taskStepId),
        action,
      );
      this.validateOrderSequence(
        normalized.map((step) => step.orderIndex),
        normalized.length,
        action,
      );
      return normalized;
    }

    const normalizedFromIds = providedIds!.map((taskStepId, index) => ({
      taskStepId,
      orderIndex: index + 1,
    }));
    this.ensureUniqueStepIds(providedIds!, action);
    return normalizedFromIds;
  }

  private buildTemplateSteps(
    repository: Repository<TemplateStep>,
    template: Template,
    steps: { taskStepId: string; orderIndex: number }[],
  ) {
    return steps.map((step) =>
      repository.create({
        template,
        taskStepId: step.taskStepId,
        orderIndex: step.orderIndex,
      }),
    );
  }

  async findAll() {
    return this.templateRepository.find({
      relations: { steps: true },
      order: { name: 'ASC', steps: { orderIndex: 'ASC' } },
    });
  }

  async findOne(id: string) {
    return this.ensureTemplate(id);
  }

  async create(dto: CreateTemplateDto, user: { id: string; role: UserRole }) {
    this.assertManager(user.role);

    const template = await this.runWithDatabaseErrorHandling(
      () =>
        this.dataSource.transaction(async (manager) => {
          const templateRepo = this.getTemplateRepository(manager);
          const stepRepo = this.getTemplateStepRepository(manager);
          const normalizedSteps = this.normalizeStepsInput(
            'Nepavyko sukurti šablono',
            dto.steps,
            dto.stepIds,
          );

          const created = templateRepo.create({
            name: this.normalizeName(dto.name),
            comment: this.normalizeComment(dto.comment ?? null),
          });

          if (normalizedSteps.length) {
            const stepIds = normalizedSteps.map((step) => step.taskStepId);
            await this.ensureTaskStepsExist(stepIds, manager);
            created.steps = this.buildTemplateSteps(stepRepo, created, normalizedSteps);
          }

          const saved = await templateRepo.save(created);
          return this.ensureTemplate(saved.id, manager);
        }),
      'Nepavyko sukurti šablono',
    );

    await this.activityLog.log('template_created', user.id, 'template', template.id);
    return template;
  }

  async update(id: string, dto: UpdateTemplateDto, user: { id: string; role: UserRole }) {
    this.assertManager(user.role);

    const template = await this.runWithDatabaseErrorHandling(
      () =>
        this.dataSource.transaction(async (manager) => {
          const templateRepo = this.getTemplateRepository(manager);
          const stepRepo = this.getTemplateStepRepository(manager);
          const templateEntity = await this.ensureTemplate(id, manager);

          if (dto.name !== undefined) {
            templateEntity.name = this.normalizeName(dto.name);
          }

          if (dto.comment !== undefined) {
            templateEntity.comment = this.normalizeComment(dto.comment ?? null);
          }

          if (dto.steps !== undefined || dto.stepIds !== undefined) {
            const normalizedSteps = this.normalizeStepsInput(
              'Nepavyko atnaujinti šablono',
              dto.steps,
              dto.stepIds,
            );

            const stepIds = normalizedSteps.map((step) => step.taskStepId);
            await this.ensureTaskStepsExist(stepIds, manager);
            templateEntity.steps = this.buildTemplateSteps(stepRepo, templateEntity, normalizedSteps);
          }

          const saved = await templateRepo.save(templateEntity);
          return this.ensureTemplate(saved.id, manager);
        }),
      'Nepavyko atnaujinti šablono',
    );

    await this.activityLog.log('template_updated', user.id, 'template', template.id);
    return template;
  }

  async remove(id: string, user: { id: string; role: UserRole }) {
    this.assertManager(user.role);

    await this.runWithDatabaseErrorHandling(
      () =>
        this.dataSource.transaction(async (manager) => {
          const templateRepo = this.getTemplateRepository(manager);
          const template = await this.ensureTemplate(id, manager);
          await templateRepo.remove(template);
        }),
      'Nepavyko ištrinti šablono',
    );

    await this.activityLog.log('template_deleted', user.id, 'template', id);
    return;
  }

  async reorderSteps(id: string, stepIds: string[], user: {
    id: string;
    role: UserRole;
  }) {
    this.assertManager(user.role);

    if (!stepIds.length) {
      throw new BadRequestException('Nepavyko perrikiuoti šablono žingsnių: sąrašas tuščias');
    }

    this.ensureUniqueStepIds(stepIds, 'Nepavyko perrikiuoti šablono žingsnių');

    const template = await this.runWithDatabaseErrorHandling(
      () =>
        this.dataSource.transaction(async (manager) => {
          const templateEntity = await this.ensureTemplate(id, manager);
          if (templateEntity.steps.length !== stepIds.length) {
            throw new BadRequestException(
              'Nepavyko perrikiuoti šablono žingsnių: turi būti pateikti visi žingsniai',
            );
          }

          const stepMap = new Map(templateEntity.steps.map((step) => [step.id, step] as const));

          for (const stepId of stepIds) {
            if (!stepMap.has(stepId)) {
              throw new NotFoundException('Šablono žingsnis nerastas');
            }
          }

          await Promise.all(
            stepIds.map((stepId, index) =>
              manager.update(TemplateStep, { id: stepId }, { orderIndex: index + 1 }),
            ),
          );

          return this.ensureTemplate(id, manager);
        }),
      'Nepavyko perrikiuoti šablono žingsnių',
    );

    await this.activityLog.log('template_steps_reordered', user.id, 'template', id);
    return template;
  }
}

