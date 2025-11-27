import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, DeepPartial, FindOptionsWhere, In, IsNull, Not, Repository } from "typeorm";
import { Assignment, AssignmentStatus, AssignmentReviewStatus } from "./assignment.entity";
import { CreateAssignmentDto } from "./dto/create-assignment.dto";
import { UpdateAssignmentDto } from "./dto/update-assignment.dto";
import { SubmitAssignmentRatingDto } from "./dto/submit-rating.dto";
import { RateAssignmentDto } from "./dto/rate-assignment.dto";
import { Hive } from "../hives/hive.entity";
import { Task } from "../tasks/task.entity";
import { TaskStep } from "../tasks/steps/task-step.entity";
import {
  AssignmentProgress,
  AssignmentProgressStatus,
} from "../progress/assignment-progress.entity";
import { User, UserRole } from "../users/user.entity";
import { ActivityLogService } from "../activity-log/activity-log.service";
import { Group } from "../groups/group.entity";
import { GroupMember } from "../groups/group-member.entity";
import { Template } from "../templates/template.entity";
import { TemplateStep } from "../templates/template-step.entity";
import { BulkFromTemplateDto } from "./dto/bulk-from-template.dto";
import {
  DEFAULT_CTA_LABEL,
  renderNotificationEmailHtml,
  renderNotificationEmailText,
} from "../email/email-template";
import { MAILER_SERVICE, MailerService } from "../notifications/mailer.service";
import { NotificationsService } from "../notifications/notifications.service";
import {
  PaginationService,
  PaginatedResult,
} from "../common/pagination/pagination.service";
import { CreateManualNoteDto } from "../hives/dto/manual-note.dto";
import { HiveEventsService } from "../hives/hive-events.service";
import { HiveEventType } from "../hives/hive-event.entity";
import { EmailService } from "../email/email.service";
import { ReviewAssignmentDto } from "./dto/review-assignment.dto";
import { AssignmentStepMediaService } from "./assignment-step-media.service";

export interface AssignmentStepMediaDto {
  id: string;
  url: string;
  mimeType: string;
  kind: string;
  sizeBytes: number;
  createdAt: string;
  userId: string;
}
@Injectable()
export class AssignmentsService {
  private readonly logger = new Logger(AssignmentsService.name);
  private readonly appBaseUrl: string | null;
  private readonly DAY_MS = 24 * 60 * 60 * 1000;

  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentsRepository: Repository<Assignment>,
    @InjectRepository(Hive) private readonly hiveRepository: Repository<Hive>,
    @InjectRepository(Task) private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskStep)
    private readonly stepRepository: Repository<TaskStep>,
    @InjectRepository(AssignmentProgress)
    private readonly progressRepository: Repository<AssignmentProgress>,
    @InjectRepository(Group)
    private readonly groupsRepository: Repository<Group>,
    @InjectRepository(GroupMember)
    private readonly groupMembersRepository: Repository<GroupMember>,
    private readonly dataSource: DataSource,
    private readonly activityLog: ActivityLogService,
    @Inject(MAILER_SERVICE) private readonly mailer: MailerService,
    private readonly notifications: NotificationsService,
    private readonly configService: ConfigService,
    private readonly pagination: PaginationService,
    private readonly hiveEvents: HiveEventsService,
    private readonly emailService: EmailService,
    private readonly stepMediaService: AssignmentStepMediaService,
  ) {
    this.appBaseUrl = this.normalizeBaseUrl(
      this.configService.get<string>("APP_URL") ??
        this.configService.get<string>("FRONTEND_URL") ??
        null,
    );
  }
  private getTodayDateString() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  private async getAccessibleHiveIds(userId: string) {
    const rows = await this.hiveRepository
      .createQueryBuilder('hive')
      .leftJoin('hive_members', 'hm', 'hm.hive_id = hive.id')
      .where('hive.ownerUserId = :userId OR hm.user_id = :userId', { userId })
      .select('DISTINCT hive.id', 'id')
      .getRawMany();

    return rows.map((row) => row.id as string);
  }

  private async ensureUserCanAccessHive(hiveId: string, userId: string) {
    const accessible = await this.hiveRepository
      .createQueryBuilder('hive')
      .leftJoin('hive_members', 'hm', 'hm.hive_id = hive.id')
      .where('hive.id = :hiveId', { hiveId })
      .andWhere('hive.ownerUserId = :userId OR hm.user_id = :userId', { userId })
      .getOne();

    return Boolean(accessible);
  }
  private async countHiveMembers(hiveId: string) {
    const result = await this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('hive_members', 'hm')
      .where('hm.hive_id = :hiveId', { hiveId })
      .getRawOne<{ count: string }>();

    return Number(result?.count ?? 0);
  }
  private assertValidDateRange(startDate: string | null | undefined, dueDate: string | null) {
    if (startDate && dueDate && startDate > dueDate) {
      throw new BadRequestException('Pabaigos data negali būti ankstesnė už pradžios datą');
    }
  }
  private assertManager(role: UserRole) {
    if (![UserRole.MANAGER, UserRole.ADMIN].includes(role)) {
      throw new ForbiddenException('Neleidžiama');
    }
  }

  private async getAssignmentParticipantIds(assignment: Assignment) {
    const hive = await this.hiveRepository.findOne({
      where: { id: assignment.hiveId },
      relations: { members: true },
    });

    if (!hive) {
      throw new NotFoundException('Hive not found');
    }

    const members = hive.members?.map((member) => member.id) ?? [];
    const ownerIds = hive.ownerUserId ? [hive.ownerUserId] : [];
    return Array.from(new Set([...ownerIds, ...members]));
  }

  private async initializeProgressForAssignments(assignments: Assignment[]) {
    if (!assignments.length) {
      return;
    }

    const assignmentIds = assignments.map((assignment) => assignment.id);
    const hiveIds = Array.from(new Set(assignments.map((assignment) => assignment.hiveId)));
    const taskIds = Array.from(new Set(assignments.map((assignment) => assignment.taskId)));

    const [hives, steps, existingProgress] = await Promise.all([
      hiveIds.length
        ? this.hiveRepository.find({ where: { id: In(hiveIds) }, relations: { members: true } })
        : Promise.resolve([]),
      taskIds.length ? this.stepRepository.find({ where: { taskId: In(taskIds) } }) : Promise.resolve([]),
      this.progressRepository.find({ where: { assignmentId: In(assignmentIds) } }),
    ]);

    const hiveById = new Map(hives.map((hive) => [hive.id, hive]));
    const stepsByTaskId = new Map<string, TaskStep[]>();

    for (const step of steps) {
      const list = stepsByTaskId.get(step.taskId) ?? [];
      list.push(step);
      stepsByTaskId.set(step.taskId, list);
    }

    const existingKeys = new Set(
      existingProgress.map((progress) =>
        `${progress.assignmentId}:${progress.taskStepId}:${progress.userId}`,
      ),
    );

    const toCreate: AssignmentProgress[] = [];

    for (const assignment of assignments) {
      const hive = hiveById.get(assignment.hiveId);

      if (!hive) {
        this.logger.warn(
          `Hive ${assignment.hiveId} not found while initializing progress for assignment ${assignment.id}`,
        );
        continue;
      }

      const participantIds = new Set<string>([
        ...(hive.ownerUserId ? [hive.ownerUserId] : []),
        ...(hive.members ?? []).map((member) => member.id),
      ]);
      const stepsForTask = stepsByTaskId.get(assignment.taskId) ?? [];

      for (const step of stepsForTask) {
        for (const participantId of participantIds) {
          if (!participantId) {
            continue;
          }

          const key = `${assignment.id}:${step.id}:${participantId}`;

          if (existingKeys.has(key)) {
            continue;
          }

          toCreate.push(
            this.progressRepository.create({
              assignmentId: assignment.id,
              taskStepId: step.id,
              userId: participantId,
              status: AssignmentProgressStatus.PENDING,
              completedAt: null,
              notes: null,
              evidenceUrl: null,
            }),
          );

          existingKeys.add(key);
        }
      }
    }

    if (toCreate.length) {
      await this.progressRepository.save(toCreate);
    }
  }

  private calculateCompletion(totalSteps: number, progress: AssignmentProgress[]) {
    if (!totalSteps) {
      return 0;
    }

    const completed = progress.filter(
      (entry) => entry.status === AssignmentProgressStatus.COMPLETED,
    ).length;

    return Math.round((completed / totalSteps) * 100);
  }

  private async sendBulkCreationSummary(
    assignments: Assignment[],
    taskTitle: string,
    dueDate: string | null,
  ) {
    const hiveIds = Array.from(new Set(assignments.map((assignment) => assignment.hiveId)));

    if (!hiveIds.length) {
      return;
    }

    const hives = await this.hiveRepository.find({
      where: { id: In(hiveIds) },
      relations: { owner: true },
    });

    const hiveById = new Map(hives.map((hive) => [hive.id, hive]));
    const assignmentsByUser = new Map<
      string,
      { assignmentIds: string[]; count: number; taskId: string | null }
    >();

    for (const assignment of assignments) {
      const hive = hiveById.get(assignment.hiveId);
      const ownerId = hive?.ownerUserId;

      if (!ownerId) {
        continue;
      }

      const current = assignmentsByUser.get(ownerId) ?? {
        assignmentIds: [],
        count: 0,
        taskId: assignment.taskId ?? null,
      };

      current.assignmentIds.push(assignment.id);
      current.count += 1;
      current.taskId = current.taskId ?? assignment.taskId ?? null;
      assignmentsByUser.set(ownerId, current);
    }

    const dueDateLabel = dueDate ?? 'nenurodytas';

    const ownerById = new Map(
      hives
        .filter((hive) => hive.ownerUserId && hive.owner?.email)
        .map((hive) => [hive.ownerUserId as string, hive.owner!]),
    );

    for (const [userId, summary] of assignmentsByUser.entries()) {
      const owner = ownerById.get(userId);

      if (!owner?.email) {
        this.logger.warn(
          `Praleidžiama užduočių suvestinė, nes nerastas el. paštas vartotojui ${userId}.`,
        );
        continue;
      }

      const subject = `Sukurtos naujos užduotys: ${taskTitle}`;
      const message = [
        `Pavadinimas: ${taskTitle}`,
        `Priskirtos užduotys: ${summary.count}`,
        `Terminas: ${dueDateLabel}`,
      ].join('\n');
      const ctaUrl = summary.assignmentIds.length
        ? this.buildAssignmentEmailLink(summary.assignmentIds[0])
        : null;

      const html = renderNotificationEmailHtml({
        subject,
        message,
        ctaUrl,
      });
      const text = renderNotificationEmailText({
        message,
        ctaUrl: ctaUrl ?? undefined,
      });

      try {
        await this.mailer.sendNotificationEmail(owner.email, subject, html, text);
      } catch (error) {
        const details = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Nepavyko išsiųsti užduočių suvestinės vartotojui ${userId}: ${details}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }

  private async notifyAssignmentCreated(
    assignments: Assignment[],
    taskTitle: string,
    creatorId: string,
    sendEmail: boolean,
  ) {
    if (!assignments.length) {
      return;
    }

    for (const assignment of assignments) {
      try {
        const participantIds = await this.getAssignmentParticipantIds(assignment);
        const uniqueParticipantIds = participantIds.filter(
          (participantId) => participantId && participantId !== creatorId,
        ) as string[];

        if (!uniqueParticipantIds.length) {
          continue;
        }

        const startLabel = assignment.startDate ?? 'nenurodyta';
        const dueLabel = assignment.dueDate ?? 'nenurodytas';
        const body = `Jums priskirta užduotis „${taskTitle}“ nuo ${startLabel} iki ${dueLabel}.`;
        const link = this.buildAssignmentLink(assignment.id);
        const emailCtaUrl = this.buildAssignmentEmailLink(assignment.id);

        await Promise.all(
          uniqueParticipantIds.map((participantId) =>
            this.notifications.createNotification(participantId, {
              type: 'assignment',
              title: `Nauja užduotis: ${taskTitle}`,
              body,
              link,
              sendEmail,
              emailSubject: 'Nauja užduotis',
              emailBody: body,
              emailCtaUrl,
              emailCtaLabel: DEFAULT_CTA_LABEL,
            }),
          ),
        );
      } catch (error) {
        const details = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Nepavyko sukurti pranešimų apie užduotį ${assignment.id}: ${details}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }

  private async notifyAssignmentUpdated(
    assignment: Assignment,
    taskTitle: string,
    changes: { startChanged: boolean; dueChanged: boolean },
    sendEmail: boolean,
  ) {
    if (!changes.startChanged && !changes.dueChanged) {
      return;
    }

    const participantIds = await this.getAssignmentParticipantIds(assignment);
    const uniqueParticipantIds = participantIds.filter((participantId) => participantId) as string[];

    if (!uniqueParticipantIds.length) {
      return;
    }

    const changeLines: string[] = [];
    if (changes.startChanged) {
      changeLines.push(`Pradžios data: ${assignment.startDate ?? 'nenurodyta'}`);
    }

    if (changes.dueChanged) {
      changeLines.push(`Pabaigos data: ${assignment.dueDate ?? 'nenurodyta'}`);
    }

    const body = [`Atnaujinta užduotis „${taskTitle}“`, ...changeLines].join('\n');
    const link = this.buildAssignmentLink(assignment.id);
    const emailCtaUrl = this.buildAssignmentEmailLink(assignment.id);

    await Promise.all(
      uniqueParticipantIds.map((participantId) =>
        this.notifications.createNotification(participantId, {
          type: 'assignment',
          title: `Atnaujinta užduotis: ${taskTitle}`,
          body,
          link,
          sendEmail,
          emailSubject: `Atnaujinta užduotis: ${taskTitle}`,
          emailBody: body,
          emailCtaUrl,
          emailCtaLabel: DEFAULT_CTA_LABEL,
        }),
      ),
    );
  }

  private buildAssignmentLink(assignmentId: string) {
    if (this.appBaseUrl) {
      return `${this.appBaseUrl}/tasks/${assignmentId}/run`;
    }

    return `/tasks/${assignmentId}/run`;
  }

  private buildAssignmentEmailLink(assignmentId: string) {
    if (this.appBaseUrl) {
      return `${this.appBaseUrl}/tasks/${assignmentId}`;
    }

    return `/tasks/${assignmentId}`;
  }

  private normalizeBaseUrl(value: string | null) {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
  }
  async create(
    dto: CreateAssignmentDto,
    user,
    options: { notify?: boolean } = {},
  ) {
    this.assertManager(user.role);
    const hive = await this.hiveRepository.findOne({
      where: { id: dto.hiveId },
    });
    if (!hive) {
      throw new NotFoundException("Hive not found");
    }
    const task = await this.taskRepository.findOne({
      where: { id: dto.taskId },
    });
    if (!task) {
      throw new NotFoundException("Task not found");
    }
    this.assertValidDateRange(dto.startDate ?? null, dto.dueDate);
    const assignment = this.assignmentsRepository.create({
      ...dto,
      createdByUserId: user.id,
      startDate: dto.startDate ?? null,
    });
    const saved = await this.assignmentsRepository.save(assignment);
    await this.initializeProgressForAssignments([saved]);
    const shouldNotify = options.notify ?? true;
    await this.notifyAssignmentCreated([saved], task.title, user.id, shouldNotify);
    await this.activityLog.log(
      "assignment_created",
      user.id,
      "assignment",
      saved.id,
    );
    await this.hiveEvents.logTaskAssigned(
      saved.hiveId,
      saved.id,
      saved.taskId,
      task.title,
      saved.startDate ?? null,
      saved.dueDate ?? null,
      user.id,
    );
    return saved;
  }
  async createBulkFromTemplate(dto: BulkFromTemplateDto, user) {
    this.assertManager(user.role);

    const trimmedTitle = dto.title.trim();
    if (!trimmedTitle) {
      throw new BadRequestException('Pavadinimas privalomas');
    }

    this.assertValidDateRange(dto.startDate ?? null, dto.dueDate);

    const uniqueGroupIds = Array.from(new Set(dto.groupIds));
    const shouldNotify = dto.notify !== false;

    const { task, assignments } = await this.dataSource.transaction(async (manager) => {
      const templateRepo = manager.getRepository(Template);
      const groupRepo = manager.getRepository(Group);
      const groupMemberRepo = manager.getRepository(GroupMember);
      const hiveRepo = manager.getRepository(Hive);
      const taskRepo = manager.getRepository(Task);
      const taskStepRepo = manager.getRepository(TaskStep);
      const assignmentRepo = manager.getRepository(Assignment);

      const template = await templateRepo.findOne({
        where: { id: dto.templateId },
        relations: { steps: true },
        order: { steps: { orderIndex: 'ASC' } },
      });

      if (!template) {
        throw new NotFoundException('Šablonas nerastas');
      }

      const groups = await groupRepo.find({ where: { id: In(uniqueGroupIds) } });
      if (groups.length !== uniqueGroupIds.length) {
        throw new BadRequestException('Neteisingi duomenys');
      }

      const memberships = await groupMemberRepo.find({
        where: { groupId: In(uniqueGroupIds) },
      });

      const userIds = Array.from(new Set(memberships.map((membership) => membership.userId)));
      const explicitHiveIds = Array.from(
        new Set(
          memberships
            .map((membership) => membership.hiveId)
            .filter((value): value is string => Boolean(value)),
        ),
      );

      const hiveWhere: FindOptionsWhere<Hive>[] = [];

      if (userIds.length) {
        hiveWhere.push({ ownerUserId: In(userIds) });
      }

      if (explicitHiveIds.length) {
        hiveWhere.push({ id: In(explicitHiveIds) });
      }

      const hives = hiveWhere.length ? await hiveRepo.find({ where: hiveWhere }) : [];

      const hiveById = new Map(hives.map((hive) => [hive.id, hive]));

      const hiveIdsByOwner = new Map<string, string[]>();
      for (const hive of hives) {
        if (!hive.ownerUserId) {
          continue;
        }
        const list = hiveIdsByOwner.get(hive.ownerUserId) ?? [];
        list.push(hive.id);
        hiveIdsByOwner.set(hive.ownerUserId, list);
      }

      const taskEntity = taskRepo.create({
        title: trimmedTitle,
        createdByUserId: user.id,
      } as DeepPartial<Task>);
      const savedTask = await taskRepo.save(taskEntity);

      const templateSteps = (template.steps ?? []).slice().sort((a, b) => a.orderIndex - b.orderIndex);

      if (templateSteps.length) {
        const stepEntities = templateSteps.map((step: TemplateStep) => {
          const source = step.taskStep;
          if (!source) {
            throw new BadRequestException('Neteisingi duomenys');
          }
          return taskStepRepo.create({
            taskId: savedTask.id,
            orderIndex: step.orderIndex,
            title: source.title,
            contentText: source.contentText ?? null,
            mediaUrl: source.mediaUrl ?? null,
            mediaType: source.mediaType ?? null,
            requireUserMedia: source.requireUserMedia ?? false,
          });
        });

        await taskStepRepo.save(stepEntities);
      }

      const assignmentsToSave: Assignment[] = [];
      const uniqueHiveIds = new Set<string>();
      const startDate = dto.startDate ?? null;

      for (const membership of memberships) {
        const targetHiveIds = membership.hiveId
          ? hiveById.has(membership.hiveId)
            ? [membership.hiveId]
            : []
          : hiveIdsByOwner.get(membership.userId) ?? [];

        for (const hiveId of targetHiveIds) {
          if (uniqueHiveIds.has(hiveId)) {
            continue;
          }
          uniqueHiveIds.add(hiveId);
          assignmentsToSave.push(
            assignmentRepo.create({
              hiveId,
              taskId: savedTask.id,
              createdByUserId: user.id,
              status: AssignmentStatus.NOT_STARTED,
              dueDate: dto.dueDate,
              startDate,
            }),
          );
        }
      }

      const savedAssignments = assignmentsToSave.length
        ? await assignmentRepo.save(assignmentsToSave)
        : [];

      return { task: savedTask, assignments: savedAssignments };
    });

    await this.initializeProgressForAssignments(assignments);

    const today = this.getTodayDateString();
    const dueSoonThreshold = this.formatDate(this.addDays(new Date(), 3));

    const startNowAssignments: Assignment[] = [];
    const futureAssignments: Assignment[] = [];
    assignments.forEach((assignment) => {
      const startDate = assignment.startDate ?? today;
      const isStartNow = !assignment.startDate || startDate <= today;

      if (isStartNow) {
        startNowAssignments.push(assignment);
      } else {
        futureAssignments.push(assignment);
      }

      if (
        assignment.dueDate &&
        assignment.dueDate <= dueSoonThreshold &&
        assignment.status !== AssignmentStatus.DONE
        &&
        !this.isShortDuration(assignment)
      ) {
        assignment.notifiedDueSoon = false;
      }
    });

    await Promise.all(
      startNowAssignments.map(async (assignment) => {
        assignment.notifiedStart = true;
        await this.assignmentsRepository.save(assignment);
        await this.sendStartEmail(assignment);
      }),
    );

    const dueSoonAssignments = assignments.filter(
      (assignment) =>
        assignment.dueDate &&
        assignment.dueDate <= dueSoonThreshold &&
        assignment.status !== AssignmentStatus.DONE &&
        !this.isShortDuration(assignment) &&
        !assignment.notifiedDueSoon,
    );

    await Promise.all(
      dueSoonAssignments.map(async (assignment) => {
        assignment.notifiedDueSoon = true;
        await this.assignmentsRepository.save(assignment);
        await this.sendDueSoonEmail(assignment);
      }),
    );

    if (assignments.length) {
      await Promise.all(
        assignments.map((assignment) =>
          this.activityLog.log('assignment_created', user.id, 'assignment', assignment.id),
        ),
      );

      if (futureAssignments.length) {
        await this.notifyAssignmentCreated(futureAssignments, trimmedTitle, user.id, shouldNotify);
      }

      if (shouldNotify) {
        if (futureAssignments.length) {
          await this.sendAssignmentEmails(futureAssignments, trimmedTitle);
        }
        const summaryDueDate = dto.dueDate ?? assignments[0]?.dueDate ?? null;
        await this.sendBulkCreationSummary(assignments, trimmedTitle, summaryDueDate);
      }

      await Promise.all(
        assignments.map((assignment) =>
          this.hiveEvents.logTaskAssigned(
            assignment.hiveId,
            assignment.id,
            assignment.taskId,
            trimmedTitle,
            assignment.startDate ?? null,
            assignment.dueDate ?? null,
            user.id,
          ),
        ),
      );
    }

    return {
      created: assignments.length,
      groups: uniqueGroupIds.length,
      templateId: dto.templateId,
      startDate: dto.startDate,
      dueDate: dto.dueDate,
    };
  }
  async findAll(
    filter: {
      hiveId?: string;
      status?: AssignmentStatus;
      groupId?: string;
      availableNow?: boolean;
      page?: number;
      limit?: number;
    },
    user,
  ): Promise<PaginatedResult<Assignment>> {
    const { page, limit } = this.pagination.getPagination(filter);
    const qb = this.assignmentsRepository.createQueryBuilder('assignment');

    if (filter.hiveId) {
      qb.andWhere('assignment.hiveId = :hiveId', { hiveId: filter.hiveId });
    }

    qb.andWhere('assignment.archived = :archived', { archived: false });

    if (filter.status) {
      qb.andWhere('assignment.status = :status', { status: filter.status });
    }

    const shouldFilterByAvailability =
      user.role === UserRole.USER || Boolean(filter.availableNow);

    if (shouldFilterByAvailability) {
      const today = this.getTodayDateString();
      qb.andWhere('(assignment.startDate IS NULL OR assignment.startDate <= :today)', {
        today,
      });
    }

    if (user.role === UserRole.USER) {
      if (filter.groupId) {
        throw new ForbiddenException('Neleidžiama');
      }

      const accessibleIds = await this.getAccessibleHiveIds(user.id);

      if (filter.hiveId) {
        if (!accessibleIds.includes(filter.hiveId)) {
          return this.pagination.buildResponse([], page, limit, 0);
        }
      } else {
        if (!accessibleIds.length) {
          return this.pagination.buildResponse([], page, limit, 0);
        }

        qb.andWhere('assignment.hiveId IN (:...accessibleIds)', {
          accessibleIds,
        });
      }
    } else if (filter.groupId) {
      this.assertManager(user.role);

      const group = await this.groupsRepository.findOne({
        where: { id: filter.groupId },
      });

      if (!group) {
        throw new NotFoundException('Group not found');
      }

      const hasMembers = await this.groupMembersRepository.exist({
        where: { groupId: filter.groupId },
      });

      if (!hasMembers) {
        return this.pagination.buildResponse([], page, limit, 0);
      }

      qb.innerJoin('assignment.hive', 'hive');
      qb.innerJoin(
        GroupMember,
        'groupMember',
        'groupMember.groupId = :groupId AND groupMember.userId = hive.ownerUserId',
        { groupId: filter.groupId },
      );
    }

    const dataQuery = qb
      .clone()
      .orderBy('assignment.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await Promise.all([
      dataQuery.getMany(),
      qb.clone().getCount(),
    ]);

    return this.pagination.buildResponse(items, page, limit, total);
  }

  private formatDateForEmail(value?: Date | string | null) {
    if (!value) {
      return 'Nenurodyta';
    }

    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) {
      return 'Nenurodyta';
    }

    return parsed.toLocaleString('lt-LT', {
      hour12: false,
      timeZone: 'Europe/Vilnius',
    });
  }

  private getAssignmentLink(assignmentId: string) {
    const baseUrl = (this.appBaseUrl ?? 'https://app.busmedaus.lt').replace(/\/$/, '');
    return `${baseUrl}/tasks/${assignmentId}`;
  }

  private async sendAssignmentEmails(assignments: Assignment[], taskTitle: string) {
    const hiveIds = Array.from(new Set(assignments.map((assignment) => assignment.hiveId)));
    if (!hiveIds.length) {
      return;
    }

    const hives = await this.hiveRepository.find({
      where: { id: In(hiveIds) },
      relations: ['owner', 'members'],
    });

    const hiveMap = new Map(hives.map((hive) => [hive.id, hive]));

    await Promise.all(
      assignments.map(async (assignment) => {
        const hive = hiveMap.get(assignment.hiveId);
        if (!hive) {
          return;
        }

        const recipients = new Map<string, string>();
        const addRecipient = (user?: User | null) => {
          if (!user?.email) {
            return;
          }
          if (user.role !== UserRole.USER) {
            return;
          }
          recipients.set(user.id, user.email);
        };

        addRecipient(hive.owner);
        for (const member of hive.members ?? []) {
          addRecipient(member);
        }

        if (!recipients.size) {
          return;
        }

        const startText = this.formatDateForEmail(assignment.startDate);

        const dueText = this.formatDateForEmail(assignment.dueDate);

        const link = this.getAssignmentLink(assignment.id);

        const startDateValue = assignment.startDate

          ? new Date(assignment.startDate).getTime()

          : null;

        const dueDateValue = assignment.dueDate

          ? new Date(assignment.dueDate).getTime()

          : null;

        const now = Date.now();

        const durationDays =

          startDateValue !== null && dueDateValue !== null && dueDateValue > startDateValue

            ? (dueDateValue - startDateValue) / this.DAY_MS

            : null;

        const startsAfterTomorrow =

          startDateValue !== null && startDateValue - now > this.DAY_MS;

        const hasLongDuration = durationDays !== null && durationDays >= 3;

        const isShortDuration = durationDays !== null && durationDays < 3;

        const useFutureEmail = startsAfterTomorrow && hasLongDuration;

        const subject = useFutureEmail ? 'Sukurta nauja užduotis' : 'Jau galite vykdyti užduotį';

        const bodyLines = useFutureEmail

          ? [

              `Jums sukurta užduotis „${taskTitle}“.`,

              `Ji prasidės ${startText} ir turite ją atlikti iki ${dueText}.`,

              `Peržiūrėti: ${link}`,

            ]

          : [

              `Užduotį „${taskTitle}“ galite vykdyti jau dabar.`,

              `Atlikite ją iki ${dueText}.`,

              `Vykdyti: ${link}`,

            ];

        const body = bodyLines.join('\n');

        const html = bodyLines.map((line) => `<p>${line}</p>`).join('');

















        await Promise.all(
          Array.from(recipients.values()).map(async (email) => {
            try {
        await this.emailService.sendMail({
          to: email,
          subject,
          text: body,
          html,
        });
            } catch (error) {
              this.logger.warn(
                `Nepavyko išsiųsti užduoties laiško ${email}: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              );
            }
          }),
        );
      }),
    );
  }
  async findOne(id: string, user, options: { skipAvailabilityCheck?: boolean } = {}) {
    const assignment = await this.assignmentsRepository.findOne({
      where: { id, archived: false },
      relations: {
        hive: { members: true },
        task: { steps: true },
      },
    });
    if (!assignment) {
      throw new NotFoundException('Užduotis nebegalioja');
    }
    if (assignment.task?.deletedAt) {
      throw new NotFoundException('Užduotis nebegalioja');
    }
    if (user.role === UserRole.USER) {
      const allowed = await this.ensureUserCanAccessHive(assignment.hiveId, user.id);
      if (!allowed) {
        const memberCount = await this.countHiveMembers(assignment.hiveId);
        this.logger.warn(
          `User denied assignment ${id}`,
          `user=${user.id} hive=${assignment.hiveId} members=${memberCount}`,
        );
        throw new ForbiddenException('Neleidžiama');
      }
      if (
        !options.skipAvailabilityCheck &&
        assignment.startDate &&
        assignment.startDate > this.getTodayDateString()
      ) {
        throw new ForbiddenException('Neleidžiama');
      }
    }
    return assignment;
  }
  async update(id: string, dto: UpdateAssignmentDto, user) {
    const assignment = await this.findOne(id, user);
    const previousStatus = assignment.status;
    if (dto.status && !Object.values(AssignmentStatus).includes(dto.status)) {
      throw new ForbiddenException("Invalid status");
    }
    const previousStartDate = assignment.startDate;
    const previousDueDate = assignment.dueDate;
    const nextStartDate =
      dto.startDate !== undefined ? dto.startDate ?? null : assignment.startDate;
    const nextDueDate = dto.dueDate ?? assignment.dueDate;

    this.assertValidDateRange(nextStartDate, nextDueDate);

    if (dto.status) {
      assignment.status = dto.status;
    }

    if (assignment.status === AssignmentStatus.DONE && !assignment.completedAt) {
      assignment.completedAt = new Date();
    }

    if (dto.dueDate !== undefined) {
      assignment.dueDate = dto.dueDate;
    }

    if (dto.startDate !== undefined) {
      assignment.startDate = dto.startDate ?? null;
    }

    const saved = await this.assignmentsRepository.save(assignment);
    await this.activityLog.log("assignment_updated", user.id, "assignment", id);
    const startChanged =
      dto.startDate !== undefined &&
      ((previousStartDate ?? null) ?? null) !== (assignment.startDate ?? null);
    const dueChanged =
      dto.dueDate !== undefined && (previousDueDate ?? null) !== (assignment.dueDate ?? null);

    let cachedTaskTitle: string | undefined;
    const getTaskTitle = async (): Promise<string> => {
      if (cachedTaskTitle !== undefined) {
        return cachedTaskTitle;
      }
      const task = await this.taskRepository.findOne({
        where: { id: assignment.taskId },
        select: { title: true },
      });
      cachedTaskTitle = task?.title ?? 'Užduotis';
      return cachedTaskTitle;
    };

    if (startChanged || dueChanged) {
      const taskTitle = await getTaskTitle();
      await this.notifyAssignmentUpdated(saved, taskTitle, { startChanged, dueChanged }, true);
      await this.hiveEvents.logTaskDatesChanged(
        saved.hiveId,
        saved.id,
        saved.taskId,
        taskTitle,
        previousStartDate ?? null,
        saved.startDate ?? null,
        previousDueDate ?? null,
        saved.dueDate ?? null,
        user.id,
      );
    }

    if (previousStatus !== AssignmentStatus.DONE && saved.status === AssignmentStatus.DONE) {
      const taskTitle = await getTaskTitle();
      await this.hiveEvents.logTaskCompleted(
        saved.hiveId,
        saved.id,
        saved.taskId,
        taskTitle,
        user.id,
      );
    }

    return saved;
  }
  private async userHasHiveAccess(assignment: Assignment, userId: string) {
    if (!assignment.hiveId) {
      return false;
    }
    return this.ensureUserCanAccessHive(assignment.hiveId, userId);
  }

  async ensureUserCanAccessAssignment(assignmentId: string, user) {
    const assignment = await this.assignmentsRepository.findOne({
      where: { id: assignmentId },
      relations: { hive: { members: true } },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (![UserRole.ADMIN, UserRole.MANAGER].includes(user.role)) {
      const allowed = await this.userHasHiveAccess(assignment, user.id);
      if (!allowed) {
        throw new ForbiddenException('Neleidžiama');
      }
    }

    return assignment;
  }

  async getDetails(
    id: string,
    user,
    requestedUserId?: string,
    options: { skipAvailabilityCheck?: boolean } = {},
  ) {
    const assignment = await this.findOne(id, user);
    const task = await this.taskRepository.findOne({
      where: { id: assignment.taskId },
      relations: ['steps'],
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const steps = (task.steps ?? []).slice().sort((a, b) => a.orderIndex - b.orderIndex);
    const totalSteps = steps.length;
    let progress: AssignmentProgress[] = [];
    let completion = 0;

    if (user.role === UserRole.USER) {
      progress = await this.progressRepository.find({
        where: { assignmentId: id, userId: user.id },
        order: { createdAt: 'ASC' },
      });
      completion = this.calculateCompletion(totalSteps, progress);
    } else if (requestedUserId) {
      const participantIds = await this.getAssignmentParticipantIds(assignment);

      if (!participantIds.includes(requestedUserId)) {
        throw new ForbiddenException('Neleidžiama');
      }

      progress = await this.progressRepository.find({
        where: { assignmentId: id, userId: requestedUserId },
        order: { createdAt: 'ASC' },
      });
      completion = this.calculateCompletion(totalSteps, progress);
    } else {
      progress = await this.progressRepository.find({
        where: { assignmentId: id },
        order: { userId: 'ASC', createdAt: 'ASC' },
      });

      const participantIds = await this.getAssignmentParticipantIds(assignment);

      if (participantIds.length) {
        const completionFractions = await Promise.all(
          participantIds.map(async (participantId) => {
            const participantCompleted = progress.filter(
              (entry) =>
                entry.userId === participantId &&
                entry.status === AssignmentProgressStatus.COMPLETED,
            ).length;

            return totalSteps ? participantCompleted / totalSteps : 0;
          }),
        );

        const average =
          completionFractions.reduce((sum, value) => sum + value, 0) /
          Math.max(completionFractions.length, 1);
        completion = Math.round(average * 100);
      }
    }

    const stepMediaEntries = await this.stepMediaService.findByAssignment(assignment.id);
    const mediaByStepId = new Map<string, AssignmentStepMediaDto[]>();
    for (const entry of stepMediaEntries) {
      const list = mediaByStepId.get(entry.stepId) ?? [];
      list.push({
        id: entry.id,
        url: entry.url,
        mimeType: entry.mimeType,
        kind: entry.kind,
        sizeBytes: entry.sizeBytes,
        createdAt: entry.createdAt.toISOString(),
        userId: entry.userId,
      });
      mediaByStepId.set(entry.stepId, list);
    }

    const enrichedProgress = progress.map((entry) => ({
      ...entry,
      media: mediaByStepId.get(entry.taskStepId) ?? [],
    }));

    return { assignment, task: { ...task, steps }, progress: enrichedProgress, completion };
  }

  async getForRun(id: string, user) {
    const assignment = await this.assignmentsRepository.findOne({
      where: { id },
      relations: {
        hive: { members: true },
        task: { steps: true },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (![UserRole.ADMIN, UserRole.MANAGER].includes(user.role)) {
      const allowed = await this.userHasHiveAccess(assignment, user.id);
      if (!allowed) {
        const hiveId = assignment.hive?.id;
        const memberIds = assignment.hive?.members?.map((member) => member.id) ?? [];
        this.logger.warn('ASSIGNMENT_RUN_FORBIDDEN', {
          assignmentId: assignment.id,
          hiveId,
          hiveOwnerId: assignment.hive?.ownerUserId,
          userId: user.id,
          userRole: user.role,
          memberIds,
        });
        throw new ForbiddenException('Neleidžiama');
      }
    }

    const result = await this.getDetails(id, user);
    if (!this.isAssignmentActive(result.assignment)) {
      throw new ForbiddenException('Neleidžiama');
    }
    return result;
  }
 
  async getPreview(id: string, user) {
    const assignment = await this.assignmentsRepository.findOne({
      where: { id },
      relations: {
        hive: { members: true },
        task: { steps: true },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (![UserRole.ADMIN, UserRole.MANAGER].includes(user.role)) {
      const allowed = await this.userHasHiveAccess(assignment, user.id);
      if (!allowed) {
        const hiveId = assignment.hive?.id;
        const memberIds = assignment.hive?.members?.map((member) => member.id) ?? [];
        this.logger.warn('ASSIGNMENT_PREVIEW_FORBIDDEN', {
          assignmentId: assignment.id,
          hiveId,
          hiveOwnerId: assignment.hive?.ownerUserId,
          userId: user.id,
          userRole: user.role,
          memberIds,
        });
        throw new ForbiddenException('Neleidžiama');
      }
    }

    const result = await this.getDetails(id, user, undefined, { skipAvailabilityCheck: true });
    return {
      ...result,
      isActive: this.isAssignmentActive(result.assignment),
    };
  }

  async listReviewQueue(options: {
    status?: AssignmentReviewStatus | 'all';
    page?: number;
    limit?: number;
  }) {
    const statusFilter = options.status ?? AssignmentReviewStatus.PENDING;
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, options.limit ?? 20);

    const buildQueueQuery = () => {
      const query = this.assignmentsRepository
        .createQueryBuilder('assignment')
        .leftJoinAndSelect('assignment.task', 'task')
        .leftJoinAndSelect('assignment.hive', 'hive')
        .leftJoinAndSelect('hive.owner', 'owner')
        .where('assignment.status = :done', { done: AssignmentStatus.DONE })
        .andWhere('assignment.rating IS NOT NULL');

      if (statusFilter && statusFilter !== 'all') {
        query.andWhere('assignment.reviewStatus = :status', { status: statusFilter });
      }

      return query;
    };

    const baseQuery = buildQueueQuery();
    const itemsQuery = baseQuery.clone().orderBy('assignment.completedAt', 'DESC');
    const totalQuery = buildQueueQuery();

    const [items, total, pending, approved, rejected] = await Promise.all([
      itemsQuery.skip((page - 1) * limit).take(limit).getMany(),
      totalQuery.getCount(),
      this.countByReviewStatus(AssignmentReviewStatus.PENDING),
      this.countByReviewStatus(AssignmentReviewStatus.APPROVED),
      this.countByReviewStatus(AssignmentReviewStatus.REJECTED),
    ]);

    const data = items.map((assignment) => ({
      id: assignment.id,
      taskTitle: assignment.task?.title ?? 'Užduotis',
      hiveLabel: assignment.hive?.label ?? '—',
      hiveId: assignment.hiveId,
      userName:
        assignment.hive?.owner?.name ??
        assignment.hive?.owner?.email ??
        '—',
      rating: assignment.rating ?? null,
      ratingComment: assignment.ratingComment ?? null,
      startDate: assignment.startDate ?? null,
      dueDate: assignment.dueDate ?? null,
      completedAt: assignment.completedAt ?? null,
      reviewStatus: assignment.reviewStatus,
      reviewComment: assignment.reviewComment ?? null,
      reviewAt: assignment.reviewAt ?? null,
      reviewByUserId: assignment.reviewByUserId ?? null,
    }));

    return {
      data,
      total,
      page,
      limit,
      counts: {
        pending,
        approved,
        rejected,
      },
    };
  }

  private countByReviewStatus(status: AssignmentReviewStatus) {
    return this.assignmentsRepository.count({
      where: {
        status: AssignmentStatus.DONE,
        reviewStatus: status,
        rating: Not(IsNull()),
      },
    });
  }

  async reviewAssignment(id: string, dto: ReviewAssignmentDto, user) {
    const assignment = await this.assignmentsRepository.findOne({
      where: { id },
      relations: { hive: true },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (![UserRole.ADMIN, UserRole.MANAGER].includes(user.role)) {
      const allowed = assignment.hiveId
        ? await this.ensureUserCanAccessHive(assignment.hiveId, user.id)
        : false;
      if (!allowed) {
        throw new ForbiddenException('Neleidžiama');
      }
    }

    assignment.reviewStatus = dto.status;
    assignment.reviewComment = dto.comment?.trim() || null;
    assignment.reviewByUserId = user.id;
    assignment.reviewAt = new Date();

    const saved = await this.assignmentsRepository.save(assignment);
    await this.activityLog.log('assignment_reviewed', user.id, 'assignment', assignment.id);

    if (assignment.hiveId && dto.comment?.trim()) {
      await this.hiveEvents.createManualNote(assignment.hiveId, {
        text: `Bus medaus bitininko pastaba: ${dto.comment.trim()}`,
      } as CreateManualNoteDto, user.id);
    }

    return saved;
  }

  async submitRating(id: string, dto: SubmitAssignmentRatingDto, user) {
    return this.rateAssignment(id, dto, user);
  }

  async rateAssignment(id: string, dto: RateAssignmentDto, user) {
    const assignment = await this.assignmentsRepository.findOne({
      where: { id },
      relations: { hive: { members: true } },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (![UserRole.ADMIN, UserRole.MANAGER].includes(user.role)) {
      if (!assignment.hiveId) {
        throw new ForbiddenException('Neleidžiama');
      }

      const allowed = await this.ensureUserCanAccessHive(assignment.hiveId, user.id);
      if (!allowed) {
        throw new ForbiddenException('Neleidžiama');
      }
    }

    if (assignment.ratedAt) {
      throw new BadRequestException('Užduotis jau įvertinta');
    }

    if (assignment.status !== AssignmentStatus.DONE) {
      assignment.status = AssignmentStatus.DONE;
    }

    if (!assignment.completedAt) {
      assignment.completedAt = new Date();
    }

    assignment.rating = dto.rating;
    const normalizedComment = dto.ratingComment?.trim() ?? '';
    assignment.ratingComment = normalizedComment.length ? normalizedComment : null;
    assignment.ratedAt = new Date();

    const saved = await this.assignmentsRepository.save(assignment);
    await this.activityLog.log('assignment_rated', user.id, 'assignment', assignment.id);
    return saved;
  }

  private isAssignmentActive(assignment: Assignment) {
    const today = this.getTodayDateString();
    if (assignment.startDate && assignment.startDate > today) {
      return false;
    }
    if (assignment.dueDate && assignment.dueDate < today) {
      return false;
    }
    return true;
  }
  async calculateHiveSummary(hiveId: string, user) {
    const hive = await this.hiveRepository.findOne({ where: { id: hiveId } });
    if (!hive) {
      throw new NotFoundException("Hive not found");
    }
    if (user.role === UserRole.USER) {
      const allowed = await this.ensureUserCanAccessHive(hiveId, user.id);
      if (!allowed) {
        throw new ForbiddenException('Neleidžiama');
      }
    }

    const assignments = await this.assignmentsRepository.find({
      where: { hiveId },
    });

    if (assignments.length === 0) {
      return {
        hiveId,
        assignmentsCount: 0,
        completion: 0,
        activeAssignmentsCount: 0,
        overdueAssignmentsCount: 0,
        primaryAssignmentProgress: null,
        primaryAssignmentId: null,
      };
    }

    const assignmentIds = assignments.map((a) => a.id);
    const taskIds = Array.from(new Set(assignments.map((a) => a.taskId)));

    const [progressEntries, taskSteps] = await Promise.all([
      this.progressRepository.find({
        where: { assignmentId: In(assignmentIds) },
      }),
      taskIds.length ? this.stepRepository.find({ where: { taskId: In(taskIds) } }) : [],
    ]);

    const stepsByTaskId = new Map<string, TaskStep[]>();
    for (const step of taskSteps) {
      const list = stepsByTaskId.get(step.taskId) ?? [];
      list.push(step);
      stepsByTaskId.set(step.taskId, list);
    }

    const completedStepsByAssignment = new Map<string, Set<string>>();
    for (const entry of progressEntries) {
      const set = completedStepsByAssignment.get(entry.assignmentId) ?? new Set<string>();
      set.add(entry.taskStepId);
      completedStepsByAssignment.set(entry.assignmentId, set);
    }

    let totalSteps = 0;
    let completed = 0;
    let activeAssignmentsCount = 0;
    let overdueAssignmentsCount = 0;
    let primaryAssignmentProgress: number | null = null;
    let primaryDueTimestamp = Number.POSITIVE_INFINITY;
    let primaryAssignmentId: string | null = null;
    let primaryAssignmentStartDate: string | null = null;
    let primaryAssignmentDueDate: string | null = null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const assignment of assignments) {
      const taskStepsForAssignment = stepsByTaskId.get(assignment.taskId) ?? [];
      totalSteps += taskStepsForAssignment.length;
      const completedSet = completedStepsByAssignment.get(assignment.id);
      const completedSteps = completedSet ? completedSet.size : 0;
      completed += completedSteps;

      if (assignment.status === AssignmentStatus.DONE) {
        continue;
      }

      const startDateValue = assignment.startDate ? new Date(assignment.startDate) : null;
      const dueDateValue = assignment.dueDate ? new Date(assignment.dueDate) : null;
      const hasStarted = !startDateValue || startDateValue <= today;

      if (!hasStarted) {
        continue;
      }

      activeAssignmentsCount += 1;

      if (dueDateValue && dueDateValue < today) {
        overdueAssignmentsCount += 1;
      }

      const progressPercent =
        taskStepsForAssignment.length === 0
          ? 0
          : Math.round((completedSteps / taskStepsForAssignment.length) * 100);

      const dueTimestamp = dueDateValue ? dueDateValue.getTime() : Number.POSITIVE_INFINITY;
      if (primaryAssignmentProgress === null || dueTimestamp < primaryDueTimestamp) {
        primaryDueTimestamp = dueTimestamp;
        primaryAssignmentProgress = progressPercent;
        primaryAssignmentId = assignment.id;
        primaryAssignmentStartDate = assignment.startDate ?? null;
        primaryAssignmentDueDate = assignment.dueDate ?? null;
      }
    }

    const percent =
      totalSteps === 0 ? 0 : Math.round((completed / totalSteps) * 100);

    return {
      hiveId,
      assignmentsCount: assignments.length,
    completion: percent,
    activeAssignmentsCount,
    overdueAssignmentsCount,
    primaryAssignmentProgress,
    primaryAssignmentId,
    primaryAssignmentStartDate,
    primaryAssignmentDueDate,
  };
}

  async resetProgressForTask(taskId: string) {
    const assignments = await this.assignmentsRepository.find({
      select: ['id'],
      where: {
        taskId,
        status: Not(AssignmentStatus.DONE),
      },
    });

    if (!assignments.length) {
      return;
    }

    const assignmentIds = assignments.map((assignment) => assignment.id);
    await this.dataSource.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .update(Assignment)
        .set({ status: AssignmentStatus.NOT_STARTED })
        .where('id IN (:...ids)', { ids: assignmentIds })
        .execute();

      await manager
        .createQueryBuilder()
        .delete()
        .from(AssignmentProgress)
        .where('assignment_id IN (:...ids)', { ids: assignmentIds })
        .execute();
    });
  }

  async archiveByTask(taskId: string, archived: boolean) {
    await this.assignmentsRepository.update({ taskId }, { archived });
  }

  private formatDate(value: Date) {
    return value.toISOString().slice(0, 10);
  }

  private addDays(date: Date, days: number) {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
  }

  private async markStartNotified(assignment: Assignment) {
    await this.assignmentsRepository.save({
      id: assignment.id,
      notifiedStart: true,
    } as Assignment);
  }

  private async markDueSoonNotified(assignment: Assignment) {
    await this.assignmentsRepository.save({
      id: assignment.id,
      notifiedDueSoon: true,
    } as Assignment);
  }

  private getDurationDays(assignment: Assignment): number | null {
    if (!assignment.startDate || !assignment.dueDate) {
      return null;
    }

    const start = new Date(assignment.startDate).getTime();
    const due = new Date(assignment.dueDate).getTime();

    if (!Number.isFinite(start) || !Number.isFinite(due) || due <= start) {
      return null;
    }

    return (due - start) / this.DAY_MS;
  }

  private isShortDuration(assignment: Assignment): boolean {
    const durationDays = this.getDurationDays(assignment);
    return durationDays !== null && durationDays < 3;
  }

  private async sendStartEmail(assignment: Assignment) {
    const hive = await this.hiveRepository.findOne({
      where: { id: assignment.hiveId },
      relations: ['owner', 'members'],
    });
    if (!hive) {
      return;
    }

    const recipients = new Map<string, string>();
    const addRecipient = (user?: User | null) => {
      if (!user?.email) return;
      if (user.role !== UserRole.USER) return;
      recipients.set(user.id, user.email);
    };

    addRecipient(hive.owner);
    for (const member of hive.members ?? []) {
      addRecipient(member);
    }

    if (!recipients.size) {
      return;
    }

    const taskTitle = assignment.task?.title ?? 'Užduotis';
    const dueDate = this.formatDateForEmail(assignment.dueDate);
    const link = this.buildAssignmentEmailLink(assignment.id);
    const body = [
      `Užduotį „${taskTitle}“ galite vykdyti jau dabar.`,
      `Atlikite ją iki ${dueDate}.`,
      `Vykdyti: ${link}`,
    ].join('\n');
    const html = body
      .split('\n')
      .map((line) => `<p>${line}</p>`)
      .join('');

    await Promise.all(
      Array.from(recipients.values()).map(async (email) => {
        try {
        await this.emailService.sendMail({
          to: email,
          subject: 'Jau galite vykdyti užduotį',
          text: body,
          html,
        });
        } catch (error) {
          this.logger.warn(
            `Nepavyko išsiųsti starto laiško ${email}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }),
    );
  }

  private async sendDueSoonEmail(assignment: Assignment) {
    const hive = await this.hiveRepository.findOne({
      where: { id: assignment.hiveId },
      relations: ['owner', 'members'],
    });
    if (!hive) {
      return;
    }

    const recipients = new Map<string, string>();
    const addRecipient = (user?: User | null) => {
      if (!user?.email) return;
      if (user.role !== UserRole.USER) return;
      recipients.set(user.id, user.email);
    };

    addRecipient(hive.owner);
    for (const member of hive.members ?? []) {
      addRecipient(member);
    }

    if (!recipients.size) {
      return;
    }

    const dueDate = this.formatDateForEmail(assignment.dueDate);
    const link = this.buildAssignmentEmailLink(assignment.id);
    const taskTitle = assignment.task?.title ?? 'Užduotis';
    const subject = 'Primename apie užduotį';
    const bodyLines = [
      `Primename, kad užduotį „${taskTitle}“ reikia atlikti iki ${dueDate}.`,
      `Vykdyti: ${link}`,
    ];

    const body = bodyLines.join('\n');
    const html = bodyLines.map((line) => `<p>${line}</p>`).join('');

    await Promise.all(
      Array.from(recipients.values()).map(async (email) => {
        try {
          await this.emailService.sendMail({
            to: email,
            subject,
            text: body,
            html,
          });
        } catch (error) {
          const details = error instanceof Error ? error.message : String(error);
          this.logger.warn(`Nepavyko išsiųsti priminimo laiško ${email}: ${details}`);
        }
      }),
    );
  }
}
