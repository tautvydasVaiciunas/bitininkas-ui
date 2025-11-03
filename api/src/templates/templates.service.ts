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

  private normalizeDescription(value?: string | null) {
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
    if (!taskStepIds.length) {
      return;
    }
    const unique = new Set(taskStepIds);
    if (unique.size !== taskStepIds.length) {
      throw new BadRequestException(`${action}: žingsniai neturi kartotis`);
    }
  }

  private async setTemplateSteps(template: Template, taskStepIds: string[], manager: EntityManager) {
    const repository = this.getTemplateStepRepository(manager);
    const existing = await repository.find({ where: { templateId: template.id } });

    if (!taskStepIds.length) {
      if (existing.length) {
        await repository.delete({ templateId: template.id });
      }
      return;
    }

    const existingMap = new Map(existing.map((step) => [step.taskStepId, step] as const));
    const toRemove = existing.filter((step) => !taskStepIds.includes(step.taskStepId));

    if (toRemove.length) {
      await repository.delete(toRemove.map((step) => step.id));
      for (const removed of toRemove) {
        existingMap.delete(removed.taskStepId);
      }
    }

    if (existingMap.size > 0) {
      await manager.query('UPDATE template_steps SET order_index = order_index + 1000 WHERE template_id = $1', [
        template.id,
      ]);
    }

    const toInsert: { taskStepId: string; orderIndex: number }[] = [];

    for (const [index, taskStepId] of taskStepIds.entries()) {
      const existingStep = existingMap.get(taskStepId);
      if (existingStep) {
        await manager.update(TemplateStep, { id: existingStep.id }, { orderIndex: index });
      } else {
        toInsert.push({ taskStepId, orderIndex: index });
      }
    }

    if (toInsert.length) {
      const entities = toInsert.map(({ taskStepId, orderIndex }) =>
        repository.create({
          template,
          taskStepId,
          orderIndex,
        }),
      );

      await repository.save(entities);
    }
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
          const stepIds = Array.isArray(dto.stepIds) ? dto.stepIds : [];

          this.ensureUniqueStepIds(stepIds, 'Nepavyko sukurti šablono');
          await this.ensureTaskStepsExist(stepIds, manager);

          const created = templateRepo.create({
            name: this.normalizeName(dto.name),
            description: this.normalizeDescription(dto.description ?? null),
          });

          const saved = await templateRepo.save(created);
          await this.setTemplateSteps(saved, stepIds, manager);

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
          const templateEntity = await this.ensureTemplate(id, manager);

          if (dto.name !== undefined) {
            templateEntity.name = this.normalizeName(dto.name);
          }

          if (dto.description !== undefined) {
            templateEntity.description = this.normalizeDescription(dto.description ?? null);
          }

          if (dto.stepIds !== undefined) {
            const stepIds = Array.isArray(dto.stepIds) ? dto.stepIds : [];
            this.ensureUniqueStepIds(stepIds, 'Nepavyko atnaujinti šablono');
            await this.ensureTaskStepsExist(stepIds, manager);
            const existingOrder = templateEntity.steps
              .slice()
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((step) => step.taskStepId);
            const shouldUpdateSteps =
              existingOrder.length !== stepIds.length ||
              existingOrder.some((id, index) => id !== stepIds[index]);

            if (shouldUpdateSteps) {
              await this.setTemplateSteps(templateEntity, stepIds, manager);
            }
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

          await manager.query('UPDATE template_steps SET order_index = order_index + 1000 WHERE template_id = $1', [
            id,
          ]);

          for (const [index, stepId] of stepIds.entries()) {
            await manager.update(TemplateStep, { id: stepId }, { orderIndex: index });
          }

          return this.ensureTemplate(id, manager);
        }),
      'Nepavyko perrikiuoti šablono žingsnių',
    );

    await this.activityLog.log('template_steps_reordered', user.id, 'template', id);
    return template;
  }
}

