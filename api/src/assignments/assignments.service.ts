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
import { DataSource, In, Repository } from "typeorm";
import { Assignment, AssignmentStatus } from "./assignment.entity";
import { CreateAssignmentDto } from "./dto/create-assignment.dto";
import { UpdateAssignmentDto } from "./dto/update-assignment.dto";
import { Hive } from "../hives/hive.entity";
import { Task } from "../tasks/task.entity";
import { TaskStep } from "../tasks/steps/task-step.entity";
import {
  AssignmentProgress,
  AssignmentProgressStatus,
} from "../progress/assignment-progress.entity";
import { UserRole } from "../users/user.entity";
import { ActivityLogService } from "../activity-log/activity-log.service";
import { Group } from "../groups/group.entity";
import { GroupMember } from "../groups/group-member.entity";
import { Template } from "../templates/template.entity";
import { TemplateStep } from "../templates/template-step.entity";
import { BulkFromTemplateDto } from "./dto/bulk-from-template.dto";
import { MAILER_PORT, MailerPort } from "../notifications/mailer.service";
import { NotificationsService } from "../notifications/notifications.service";
@Injectable()
export class AssignmentsService {
  private readonly logger = new Logger(AssignmentsService.name);
  private readonly appBaseUrl: string | null;

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
    @Inject(MAILER_PORT) private readonly mailer: MailerPort,
    private readonly notifications: NotificationsService,
    private readonly configService: ConfigService,
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
    return Array.from(new Set([hive.ownerUserId, ...members]));
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
        hive.ownerUserId,
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

    for (const [userId, summary] of assignmentsByUser.entries()) {
      try {
        await this.mailer.send({
          userId,
          subject: `Sukurtos naujos užduotys: ${taskTitle}`,
          body: `Pavadinimas: ${taskTitle}\nPriskirtos užduotys: ${summary.count}\nTerminas: ${dueDateLabel}`,
        });
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

        const dueLabel = assignment.dueDate ?? 'nenurodytas';
        const body = `Jums priskirta užduotis „${taskTitle}“. Terminas: ${dueLabel}.`;
        const link = this.buildAssignmentLink(assignment.id);

        const emailBody = [`Jums priskirta užduotis „${taskTitle}“.`];
        emailBody.push(`Terminas: ${dueLabel}.`);
        emailBody.push(`Nuoroda: ${link}`);

        await Promise.all(
          uniqueParticipantIds.map((participantId) =>
            this.notifications.createNotification(participantId, {
              type: 'assignment',
              title: `Nauja užduotis: ${taskTitle}`,
              body,
              link,
              sendEmail,
              emailSubject: `Nauja užduotis: ${taskTitle}`,
              emailBody: emailBody.join('\n'),
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

  private buildAssignmentLink(assignmentId: string) {
    if (this.appBaseUrl) {
      return `${this.appBaseUrl}/tasks/${assignmentId}/run`;
    }

    return `/tasks/${assignmentId}/run`;
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
  async create(dto: CreateAssignmentDto, user) {
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
    await this.notifyAssignmentCreated([saved], task.title, user.id, true);
    await this.activityLog.log(
      "assignment_created",
      user.id,
      "assignment",
      saved.id,
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

      const hives = userIds.length
        ? await hiveRepo.find({ where: { ownerUserId: In(userIds) } })
        : [];

      const hiveIdsByOwner = new Map<string, string[]>();
      for (const hive of hives) {
        const list = hiveIdsByOwner.get(hive.ownerUserId) ?? [];
        list.push(hive.id);
        hiveIdsByOwner.set(hive.ownerUserId, list);
      }

      const taskEntity = taskRepo.create({
        title: trimmedTitle,
        description: dto.description?.trim() ?? '',
        createdByUserId: user.id,
      });
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

      for (const userId of userIds) {
        const userHiveIds = hiveIdsByOwner.get(userId) ?? [];
        for (const hiveId of userHiveIds) {
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

    if (assignments.length) {
      await Promise.all(
        assignments.map((assignment) =>
          this.activityLog.log('assignment_created', user.id, 'assignment', assignment.id),
        ),
      );

      await this.notifyAssignmentCreated(assignments, trimmedTitle, user.id, shouldNotify);

      if (shouldNotify) {
        const summaryDueDate = dto.dueDate ?? assignments[0]?.dueDate ?? null;
        await this.sendBulkCreationSummary(assignments, trimmedTitle, summaryDueDate);
      }
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
    },
    user,
  ) {
    const qb = this.assignmentsRepository.createQueryBuilder('assignment');

    if (filter.hiveId) {
      qb.andWhere('assignment.hiveId = :hiveId', { hiveId: filter.hiveId });
    }

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
          return [];
        }
      } else {
        if (!accessibleIds.length) {
          return [];
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
        return [];
      }

      qb.innerJoin('assignment.hive', 'hive');
      qb.innerJoin(
        GroupMember,
        'groupMember',
        'groupMember.groupId = :groupId AND groupMember.userId = hive.ownerUserId',
        { groupId: filter.groupId },
      );
    }

    return qb.getMany();
  }
  async findOne(id: string, user) {
    const assignment = await this.assignmentsRepository.findOne({
      where: { id },
    });
    if (!assignment) {
      throw new NotFoundException("Assignment not found");
    }
    if (user.role === UserRole.USER) {
      const allowed = await this.ensureUserCanAccessHive(assignment.hiveId, user.id);
      if (!allowed) {
        throw new ForbiddenException('Neleidžiama');
      }
      if (
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
    if (dto.status && !Object.values(AssignmentStatus).includes(dto.status)) {
      throw new ForbiddenException("Invalid status");
    }
    const nextStartDate =
      dto.startDate !== undefined ? dto.startDate ?? null : assignment.startDate;
    const nextDueDate = dto.dueDate ?? assignment.dueDate;

    this.assertValidDateRange(nextStartDate, nextDueDate);

    if (dto.status) {
      assignment.status = dto.status;
    }

    if (dto.dueDate !== undefined) {
      assignment.dueDate = dto.dueDate;
    }

    if (dto.startDate !== undefined) {
      assignment.startDate = dto.startDate ?? null;
    }

    const saved = await this.assignmentsRepository.save(assignment);
    await this.activityLog.log("assignment_updated", user.id, "assignment", id);
    return saved;
  }
  async getDetails(id: string, user, requestedUserId?: string) {
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

    return { assignment, task: { ...task, steps }, progress, completion };
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
      return { hiveId, assignmentsCount: 0, completion: 0 };
    }
    const assignmentIds = assignments.map((a) => a.id);
    const progress = await this.progressRepository.find({
      where: { assignmentId: In(assignmentIds) },
    });
    const completedStepIds = new Set(progress.map((p) => p.taskStepId));
    let totalSteps = 0;
    let completed = 0;
    for (const assignment of assignments) {
      const taskSteps = await this.stepRepository.find({
        where: { taskId: assignment.taskId },
      });
      totalSteps += taskSteps.length;
      completed += taskSteps.filter((step) =>
        completedStepIds.has(step.id),
      ).length;
    }
    const percent =
      totalSteps === 0 ? 0 : Math.round((completed / totalSteps) * 100);
    return {
      hiveId,
      assignmentsCount: assignments.length,
      completion: percent,
    };
  }
}
