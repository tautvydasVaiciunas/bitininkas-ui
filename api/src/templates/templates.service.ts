import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, QueryFailedError, Repository } from 'typeorm';

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
      throw new ForbiddenException('Requires manager or admin role');
    }
  }

  private normalizeName(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new BadRequestException('Name is required');
    }

    return trimmed;
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

  private async ensureTemplate(id: string) {
    const template = await this.templateRepository.findOne({
      where: { id },
      relations: { steps: true },
      order: { steps: { orderIndex: 'ASC' } },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  private async ensureTaskStepsExist(taskStepIds: string[]) {
    if (!taskStepIds.length) {
      return;
    }

    const found = await this.taskStepRepository.find({ where: { id: In(taskStepIds) } });
    if (found.length !== taskStepIds.length) {
      throw new NotFoundException('Task step not found');
    }
  }

  private buildTemplateSteps(
    template: Template,
    steps: { taskStepId: string; orderIndex?: number }[],
  ) {
    return steps.map((step, index) =>
      this.templateStepRepository.create({
        template,
        taskStepId: step.taskStepId,
        orderIndex: step.orderIndex ?? index + 1,
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

    const template = this.templateRepository.create({
      name: this.normalizeName(dto.name),
    });

    if (dto.steps?.length) {
      const stepIds = dto.steps.map((step) => step.taskStepId);
      await this.ensureTaskStepsExist(stepIds);
      template.steps = this.buildTemplateSteps(template, dto.steps);
    }

    const saved = await this.runWithDatabaseErrorHandling(
      () => this.templateRepository.save(template),
      'Unable to create template',
    );

    await this.activityLog.log('template_created', user.id, 'template', saved.id);
    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateTemplateDto, user: { id: string; role: UserRole }) {
    this.assertManager(user.role);
    const template = await this.ensureTemplate(id);

    if (dto.name !== undefined) {
      template.name = this.normalizeName(dto.name);
    }

    if (dto.steps !== undefined) {
      const stepIds = dto.steps.map((step) => step.taskStepId);
      await this.ensureTaskStepsExist(stepIds);
      template.steps = this.buildTemplateSteps(template, dto.steps);
    }

    const saved = await this.runWithDatabaseErrorHandling(
      () => this.templateRepository.save(template),
      'Unable to update template',
    );

    await this.activityLog.log('template_updated', user.id, 'template', saved.id);
    return this.findOne(id);
  }

  async remove(id: string, user: { id: string; role: UserRole }) {
    this.assertManager(user.role);
    const template = await this.ensureTemplate(id);

    await this.runWithDatabaseErrorHandling(
      () => this.templateRepository.remove(template),
      'Unable to delete template',
    );

    await this.activityLog.log('template_deleted', user.id, 'template', id);
    return { deleted: true };
  }

  async reorderSteps(
    id: string,
    payload: { id: string; orderIndex: number }[],
    user: { id: string; role: UserRole },
  ) {
    this.assertManager(user.role);

    if (!payload.length) {
      throw new BadRequestException('Unable to reorder template steps: payload is empty');
    }

    const uniqueIds = new Set(payload.map((step) => step.id));
    if (uniqueIds.size !== payload.length) {
      throw new BadRequestException('Unable to reorder template steps: duplicate ids provided');
    }

    const template = await this.ensureTemplate(id);
    const stepMap = new Map(template.steps.map((step) => [step.id, step] as const));

    for (const item of payload) {
      if (!stepMap.has(item.id)) {
        throw new NotFoundException('Template step not found');
      }
    }

    if (payload.length !== template.steps.length) {
      throw new BadRequestException('Unable to reorder template steps: all steps must be provided');
    }

    await this.runWithDatabaseErrorHandling(
      () =>
        this.dataSource.transaction(async (manager) => {
          for (const { id: stepId, orderIndex } of payload) {
            await manager.update(TemplateStep, { id: stepId }, { orderIndex });
          }
        }),
      'Unable to reorder template steps',
    );

    await this.activityLog.log('template_steps_reordered', user.id, 'template', id);
    return this.findOne(id);
  }
}
