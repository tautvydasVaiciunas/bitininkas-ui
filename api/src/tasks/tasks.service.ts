import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';

import { Task, TaskFrequency } from './task.entity';
import { TaskStep } from './steps/task-step.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ReorderStepsDto } from './steps/dto/reorder-steps.dto';
import { UserRole } from '../users/user.entity';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { TaskStepsService } from './steps/task-steps.service';
import { runWithDatabaseErrorHandling } from '../common/errors/database-error.util';
import { AssignmentStatus } from '../assignments/assignment.entity';
import { AssignmentsService } from '../assignments/assignments.service';
import { Template } from '../templates/template.entity';
import { NewsPost } from '../news/news-post.entity';

type StepInput = Partial<
  Pick<TaskStep, 'title' | 'contentText' | 'mediaUrl' | 'mediaType' | 'requireUserMedia' | 'orderIndex'>
>;

export interface LatestNewsMetadata {
  assignmentStartDate: string | null;
  assignmentDueDate: string | null;
  groups: { id: string; name: string }[];
}

export type TaskWithLatestNews = Task & {
  latestNews: LatestNewsMetadata | null;
};

export type TaskStatusFilter = 'active' | 'archived' | 'past' | 'all';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectRepository(TaskStep)
    private readonly stepsRepository: Repository<TaskStep>,
    @InjectRepository(Template)
    private readonly templateRepository: Repository<Template>,
    @InjectRepository(NewsPost)
    private readonly newsRepository: Repository<NewsPost>,
    private readonly taskStepsService: TaskStepsService,
    private readonly activityLog: ActivityLogService,
    private readonly assignmentsService: AssignmentsService,
  ) {}

  private assertManager(role: UserRole) {
    if (![UserRole.MANAGER, UserRole.ADMIN].includes(role)) {
      throw new ForbiddenException('Reikia vadybininko arba administratoriaus rolės');
    }
  }

  private normalizeNullableString(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : null;
  }

  private getTodayDateString() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private normalizeMediaType(value?: StepInput['mediaType']) {
    if (!value) {
      return null;
    }

    return value;
  }

  private normalizeStepInput(step: StepInput, orderIndex: number): StepInput {
    return {
      ...step,
      title: step.title ? step.title.trim() : step.title,
      contentText: this.normalizeNullableString(step.contentText),
      mediaUrl: this.normalizeNullableString(step.mediaUrl),
      mediaType: this.normalizeMediaType(step.mediaType),
      requireUserMedia: step.requireUserMedia ?? false,
      orderIndex,
    };
  }

  private buildStepsFromTemplate(template: Template): StepInput[] {
    const steps = Array.isArray(template.steps) ? [...template.steps] : [];
    return steps
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((templateStep) => {
        const taskStep = templateStep.taskStep;
        const contentText = this.normalizeNullableString(taskStep?.contentText ?? null);
        const mediaUrl = this.normalizeNullableString(taskStep?.mediaUrl ?? null);
        const mediaType = taskStep?.mediaType;
        return {
          title: taskStep?.title ?? 'Žingsnis',
          contentText: contentText ?? undefined,
          mediaUrl: mediaUrl ?? undefined,
          mediaType: mediaType ?? undefined,
          requireUserMedia: taskStep?.requireUserMedia ?? false,
          orderIndex: templateStep.orderIndex,
        };
      });
  }

  private async getTaskWithRelations(id: string) {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: { steps: true, template: true },
      order: { steps: { orderIndex: 'ASC' } },
    });

    if (!task) {
      return null;
    }

    const seasonMonths = Array.isArray(task.seasonMonths) ? task.seasonMonths : [];
    const steps = Array.isArray(task.steps)
      ? [...task.steps].sort((a, b) => a.orderIndex - b.orderIndex)
      : [];

    return {
      ...task,
      seasonMonths,
      steps,
    };
  }

  async create(dto: CreateTaskDto, user: { id: string; role: UserRole }) {
    this.assertManager(user.role);

    const { steps = [], ...taskData } = dto;

    const title = dto.title?.trim();
    if (!title) {
      this.logger.warn('Nepavyko sukurti užduoties: pavadinimas privalomas');
      throw new BadRequestException({
        message: 'Nepavyko sukurti užduoties',
        details: 'Pavadinimas privalomas',
      });
    }

    if (taskData.defaultDueDays !== undefined && taskData.defaultDueDays < 0) {
      this.logger.warn('Nepavyko sukurti užduoties: defaultDueDays turi būti neneigiamas');
      throw new BadRequestException({
        message: 'Nepavyko sukurti užduoties',
        details: 'Numatytas terminas turi būti neneigiamas',
      });
    }

    const defaultDueDays =
      taskData.defaultDueDays !== undefined ? taskData.defaultDueDays : 7;

    const task = this.tasksRepository.create({
      title,
      category: this.normalizeNullableString(taskData.category),
      seasonMonths: taskData.seasonMonths ?? [],
      frequency: taskData.frequency ?? TaskFrequency.ONCE,
      defaultDueDays,
      templateId: dto.templateId ?? null,
      createdByUserId: user.id,
      steps: steps.map((step, index) =>
        this.stepsRepository.create(
          this.normalizeStepInput(step, step.orderIndex ?? index + 1),
        ),
      ),
    });

    const saved = await runWithDatabaseErrorHandling(
      () => this.tasksRepository.save(task),
      { message: 'Nepavyko sukurti užduoties' },
    );
    await this.activityLog.log('task_created', user.id, 'task', saved.id);
    const fullTask = await this.getTaskWithRelations(saved.id);
    if (fullTask) {
      const [decorated] = await this.decorateTasksWithLatestNews([fullTask]);
      return decorated;
    }

    return {
      ...saved,
      seasonMonths: Array.isArray(saved.seasonMonths) ? saved.seasonMonths : [],
      latestNews: null,
    };
  }

  async findAll(
    user: { id: string; role: UserRole },
    query: {
      category?: string;
      frequency?: TaskFrequency;
      seasonMonth?: number;
      status?: TaskStatusFilter;
    },
  ) {
    const { category, frequency, seasonMonth, status = 'active' } = query;
    const showArchived = status === 'archived';
    const showPast = status === 'past';
    const showAll = status === 'all';
    const showActive = status === 'active';
    const today = this.getTodayDateString();

    const qb = this.tasksRepository.createQueryBuilder('task').withDeleted();
    qb.leftJoinAndSelect('task.template', 'template');
    if (showArchived) {
      qb.where('task.deletedAt IS NOT NULL');
    } else if (showAll) {
      qb.where('1=1');
    } else {
      qb.where('task.deletedAt IS NULL');
    }

    if (user.role === UserRole.USER) {
      qb.innerJoin('task.assignments', 'assignment');
      qb.innerJoin('assignment.hive', 'hive');
      qb.leftJoin('hive.members', 'member');
      qb.andWhere('(hive.ownerUserId = :userId OR member.id = :userId)', {
        userId: user.id,
      });
      qb.distinct(true);
      if (showPast) {
        qb.andWhere('assignment.dueDate < :today', { today });
      } else if (showActive) {
        qb.andWhere('(assignment.dueDate >= :today OR assignment.dueDate IS NULL)', { today });
      }
    }

    if (user.role !== UserRole.USER) {
      if (showPast) {
        qb.innerJoin('task.assignments', 'pastAssignment');
        qb.andWhere('pastAssignment.dueDate < :today', { today });
        qb.distinct(true);
      } else if (showActive) {
        qb.innerJoin('task.assignments', 'activeAssignment');
        qb.andWhere('(activeAssignment.dueDate >= :today OR activeAssignment.dueDate IS NULL)', { today });
        qb.distinct(true);
      }
    }

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

    qb.orderBy('task.createdAt', 'DESC');

    const tasks = await qb.getMany();
    return this.decorateTasksWithLatestNews(tasks);
  }

  async findOne(id: string) {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: { template: true },
    });

    if (!task) {
      throw new NotFoundException('Užduotis nerasta');
    }

    const decorated = await this.decorateTasksWithLatestNews([task]);
    return decorated[0];
  }

  private async decorateTasksWithLatestNews(tasks: Task[]): Promise<TaskWithLatestNews[]> {
    if (!tasks.length) {
      return [];
    }

    const metadataMap = await this.loadLatestNewsMetadata(tasks.map((task) => task.id));
    return tasks.map((task) => ({
      ...task,
      seasonMonths: Array.isArray(task.seasonMonths) ? task.seasonMonths : [],
      templateName: task.template?.name ?? null,
      latestNews: metadataMap.get(task.id) ?? null,
    }));
  }

  private async loadLatestNewsMetadata(taskIds: string[]) {
    const metadata = new Map<string, LatestNewsMetadata>();
    if (!taskIds.length) {
      return metadata;
    }

    const posts = await this.newsRepository.find({
      where: { attachedTaskId: In(taskIds) },
      relations: { groups: true },
      order: { createdAt: 'DESC' },
    });

    for (const post of posts) {
      if (!post.attachedTaskId || metadata.has(post.attachedTaskId)) {
        continue;
      }

      metadata.set(post.attachedTaskId, {
        assignmentStartDate: post.assignmentStartDate,
        assignmentDueDate: post.assignmentDueDate,
        groups: (post.groups ?? []).map((group) => ({
          id: group.id,
          name: group.name,
        })),
      });
    }

    return metadata;
  }

  async update(id: string, dto: UpdateTaskDto, user: { id: string; role: UserRole }) {
    this.assertManager(user.role);
    const { steps, templateId, ...taskData } = dto;
    const task = await this.findOne(id);

    if (templateId !== undefined) {
      task.templateId = templateId ?? null;
    }

    if (taskData.title !== undefined) {
      task.title = taskData.title.trim();
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
      if (taskData.defaultDueDays < 0) {
        throw new BadRequestException({
          message: 'Nepavyko atnaujinti užduoties',
          details: 'Numatytas terminas turi būti neneigiamas',
        });
      }
      task.defaultDueDays = taskData.defaultDueDays;
    }

    const saved = await runWithDatabaseErrorHandling(
      () => this.tasksRepository.save(task),
      { message: 'Nepavyko atnaujinti užduoties' },
    );

    let templateUpdated = false;
    if (templateId) {
      const template = await this.templateRepository.findOne({
        where: { id: templateId },
        relations: { steps: { taskStep: true } },
      });

      if (!template) {
        throw new NotFoundException('Šablonas nerastas');
      }

      const templateSteps = this.buildStepsFromTemplate(template);
      await this.updateSteps(
        id,
        templateSteps.map((step, index) =>
          this.normalizeStepInput(step, step.orderIndex ?? index + 1),
        ),
        user,
      );

      templateUpdated = true;
    } else if (steps) {
      await this.updateSteps(
        id,
        steps.map((step, index) =>
          this.normalizeStepInput(step, step.orderIndex ?? index + 1),
        ),
        user,
      );
    }

    if (templateUpdated) {
      await this.assignmentsService.resetProgressForTask(id);
    }

    await this.activityLog.log('task_updated', user.id, 'task', id);

    const fullTask = await this.getTaskWithRelations(id);
    if (fullTask) {
      return fullTask;
    }

    return {
      ...saved,
      seasonMonths: Array.isArray(saved.seasonMonths) ? saved.seasonMonths : [],
    };
  }

  async setArchived(id: string, archived: boolean, user: { id: string; role: UserRole }) {
    this.assertManager(user.role);
    const task = await this.tasksRepository.findOne({ where: { id } });

    if (!task) {
      throw new NotFoundException('Užduotis nerasta');
    }

    task.deletedAt = archived ? new Date() : null;
    await runWithDatabaseErrorHandling(
      () => this.tasksRepository.save(task),
      { message: 'Nepavyko atnaujinti užduoties statuso' },
    );
    await this.assignmentsService.archiveByTask(id, archived);

    await this.activityLog.log('task_archived', user.id, 'task', id);
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

      await runWithDatabaseErrorHandling(
        () => this.stepsRepository.save(newStep),
        { message: 'Nepavyko sukurti užduoties žingsnių' },
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

      await runWithDatabaseErrorHandling(
        () => this.stepsRepository.save(newStep),
        { message: 'Nepavyko atnaujinti užduoties žingsnių' },
      );
    }

    await this.activityLog.log('task_steps_updated', user.id, 'task', taskId);
    return this.getSteps(taskId);
  }
}
