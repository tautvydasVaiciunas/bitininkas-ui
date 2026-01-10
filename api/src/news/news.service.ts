import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, FindOptionsWhere, In, Repository } from 'typeorm';

import { NewsPost } from './news-post.entity';
import { Group } from '../groups/group.entity';
import { GroupMember } from '../groups/group-member.entity';
import { User, UserRole } from '../users/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { ListNewsQueryDto } from './dto/list-news-query.dto';
import { runWithDatabaseErrorHandling } from '../common/errors/database-error.util';
import {
  PaginationService,
  PaginatedResult,
} from '../common/pagination/pagination.service';
import { AssignmentsService } from '../assignments/assignments.service';
import { Assignment } from '../assignments/assignment.entity';
import { TasksService } from '../tasks/tasks.service';
import { CreateTaskDto } from '../tasks/dto/create-task.dto';
import { Task } from '../tasks/task.entity';
import { Hive } from '../hives/hive.entity';
import { Template } from '../templates/template.entity';

interface NewsGroupSummary {
  id: string;
  name: string;
}

export interface NewsPostResponse {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  targetAll: boolean;
  groups: NewsGroupSummary[];
  attachedTaskId: string | null;
  assignmentStartDate: string | null;
  assignmentDueDate: string | null;
  sendNotifications: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedNewsResponse extends PaginatedResult<NewsPostResponse> {
  hasMore: boolean;
}

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);
  private readonly appBaseUrl: string | null;

  constructor(
    @InjectRepository(NewsPost)
    private readonly newsRepository: Repository<NewsPost>,
    @InjectRepository(Group)
    private readonly groupsRepository: Repository<Group>,
    @InjectRepository(GroupMember)
    private readonly groupMembersRepository: Repository<GroupMember>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(Hive)
    private readonly hiveRepository: Repository<Hive>,
    @InjectRepository(Template)
    private readonly templateRepository: Repository<Template>,
    private readonly notifications: NotificationsService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly pagination: PaginationService,
    private readonly assignmentsService: AssignmentsService,
    private readonly tasksService: TasksService,
  ) {
    this.appBaseUrl = this.normalizeBaseUrl(
      this.configService.get<string>('APP_URL') ??
        this.configService.get<string>('FRONTEND_URL') ??
        null,
    );
  }

  private sanitizeTitle(value: string) {
    const title = value?.trim();
    if (!title) {
      throw new BadRequestException('Pavadinimas privalomas');
    }
    return title;
  }

  private sanitizeBody(value: string) {
    if (typeof value !== 'string') {
      throw new BadRequestException('Tekstas privalomas');
    }
    const body = value.trim();
    if (!body) {
      throw new BadRequestException('Tekstas privalomas');
    }
    return body;
  }

  private sanitizeImageUrl(value: string | null | undefined) {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const isValid =
      trimmed.startsWith('/uploads/') ||
      /^https?:\/\//i.test(trimmed);

    if (!isValid) {
      throw new BadRequestException('Netinkamas paveikslėlio adresas');
    }

    return trimmed;
  }

  private async resolveGroups(groupIds: string[]): Promise<Group[]> {
    if (groupIds.length === 0) {
      return [];
    }

    const uniqueIds = Array.from(new Set(groupIds));
    const groups = await this.groupsRepository.find({
      where: { id: In(uniqueIds) },
    });

    if (groups.length !== uniqueIds.length) {
      throw new BadRequestException('Pasirinktos grupės nerastos');
    }

    return groups;
  }

  private mapPost(post: NewsPost): NewsPostResponse {
    return {
      id: post.id,
      title: post.title,
      body: post.body,
      imageUrl: post.imageUrl ?? null,
      targetAll: post.targetAll,
      groups: Array.isArray(post.groups)
        ? post.groups.map((group) => ({
            id: group.id,
            name: group.name,
          }))
        : [],
      attachedTaskId: post.attachedTaskId ?? null,
      assignmentStartDate: post.assignmentStartDate ?? null,
      assignmentDueDate: post.assignmentDueDate ?? null,
      sendNotifications: post.sendNotifications ?? true,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  }

  private async collectRecipientIds(
    targetAll: boolean,
    groupIds: string[],
  ): Promise<string[]> {
    if (targetAll) {
      const users = await this.usersRepository.find({
        select: ['id'],
        withDeleted: false,
      });
      return users.map((user) => user.id);
    }

    if (groupIds.length === 0) {
      return [];
    }

    const rows = await this.groupMembersRepository
      .createQueryBuilder('membership')
      .select('DISTINCT membership.userId', 'userId')
      .where('membership.groupId IN (:...groupIds)', { groupIds })
      .getRawMany<{ userId: string }>();

    return rows.map((row) => row.userId);
  }

  private normalizeNullable(value?: string | null) {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  private buildEmailSnippet(value: string | null | undefined, limit = 180) {
    if (!value) {
      return '';
    }
    const normalized = value.trim();
    if (normalized.length <= limit) {
      return normalized;
    }
    const truncated = normalized.slice(0, limit).trimEnd();
    return `${truncated} (...)`;
  }

  private buildStepsFromTemplate(template: Template): CreateTaskDto['steps'] {
    const steps = Array.isArray(template.steps) ? [...template.steps] : [];
    return steps
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((templateStep) => {
        const taskStep = templateStep.taskStep;
        const contentText = this.normalizeNullable(taskStep?.contentText ?? null);
        const mediaUrl = this.normalizeNullable(taskStep?.mediaUrl ?? null);
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

  private normalizeDate(value?: string | null): string | null {
    if (!value) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  private getTodayDateString() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private addDays(value: string, days: number) {
    const date = new Date(`${value}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  private async collectAssignmentHives(groupIds: string[]): Promise<string[]> {
    if (!groupIds.length) {
      return [];
    }

    const memberships = await this.groupMembersRepository.find({
      where: { groupId: In(groupIds) },
    });

    if (!memberships.length) {
      return [];
    }

    const explicitHiveIds = Array.from(
      new Set(
        memberships
          .map((membership) => membership.hiveId)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    if (!explicitHiveIds.length) {
      return [];
    }

    const hives = await this.hiveRepository.find({
      where: { id: In(explicitHiveIds) },
    });
    return Array.from(new Set(hives.map((hive) => hive.id)));
  }

  private buildPaginationResult(
    posts: NewsPost[],
    page: number,
    limit: number,
    hasMore: boolean,
    total: number,
  ): PaginatedNewsResponse {
    const sorted = [...posts].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    const base = this.pagination.buildResponse(
      sorted.map((post) => this.mapPost(post)),
      page,
      limit,
      total,
    );

    return { ...base, hasMore };
  }

  async listForUser(
    userId: string | null | undefined,
    query: ListNewsQueryDto,
  ): Promise<PaginatedNewsResponse> {
    const { page, limit } = this.pagination.getPagination(query);
    const offset = (page - 1) * limit;

    const normalizedUserId = typeof userId === 'string' && userId ? userId : null;

    try {
      const memberships = normalizedUserId
        ? await runWithDatabaseErrorHandling(
            () =>
              this.groupMembersRepository.find({
                where: { userId: normalizedUserId },
                select: ['groupId'],
              }),
            {
              message: 'Nepavyko gauti naujienų sąrašo',
              code: 'news_list_failed',
            },
          )
        : [];

      const groupIds = memberships.map((membership) => membership.groupId);

      const baseQuery = this.newsRepository
        .createQueryBuilder('news')
        .where(
          new Brackets((qb) => {
            qb.where('news.targetAll = true');

            if (groupIds.length > 0) {
              qb.orWhere(
                `EXISTS (
                  SELECT 1
                  FROM news_post_groups npg
                  WHERE npg.post_id = news.id
                    AND npg.group_id IN (:...groupIds)
                )`,
                { groupIds },
              );
            }
          }),
        );

      const totalResult = await runWithDatabaseErrorHandling(
        () =>
          baseQuery
            .clone()
            .select('COUNT(*)', 'count')
            .getRawOne<{ count: string }>(),
        {
          message: 'Nepavyko gauti naujienų sąrašo',
          code: 'news_list_failed',
        },
      );

      const total = Number(totalResult?.count ?? 0);

      if (!Number.isFinite(total) || total <= 0) {
        return { ...this.pagination.buildResponse([], page, limit, 0), hasMore: false };
      }

      if (offset >= total) {
        return { ...this.pagination.buildResponse([], page, limit, total), hasMore: false };
      }

      const rows = await runWithDatabaseErrorHandling(
        () =>
          baseQuery
            .clone()
            .select('news.id', 'id')
            .addSelect('news.createdAt', 'createdAt')
            .orderBy('news.createdAt', 'DESC')
            .skip(offset)
            .take(limit + 1)
            .getRawMany<{ id: string }>(),
        {
          message: 'Nepavyko gauti naujienų sąrašo',
          code: 'news_list_failed',
        },
      );

      const ids = rows.slice(0, limit).map((row) => row.id);
      const hasMore = offset + ids.length < total;

      if (ids.length === 0) {
        return { ...this.pagination.buildResponse([], page, limit, total), hasMore };
      }

      const posts = await runWithDatabaseErrorHandling(
        () =>
          this.newsRepository.find({
            where: { id: In(ids) },
            relations: { groups: true },
          }),
        {
          message: 'Nepavyko gauti naujienų sąrašo',
          code: 'news_list_failed',
        },
      );

      return this.buildPaginationResult(posts, page, limit, hasMore, total);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        'Nepavyko gauti naujienų sąrašo',
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Įvyko nenumatyta klaida');
    }
  }

  async findOneForUser(
    id: string,
    userId: string | null | undefined,
  ): Promise<NewsPostResponse> {
    const post = await this.newsRepository.findOne({
      where: { id },
      relations: { groups: true },
    });

    if (!post) {
      throw new NotFoundException('Naujiena nerasta');
    }

    if (!post.targetAll) {
      const normalizedUserId = typeof userId === 'string' && userId ? userId : null;
      if (!normalizedUserId) {
        throw new NotFoundException('Naujiena nerasta');
      }

      const groupIds = Array.isArray(post.groups)
        ? post.groups.map((group) => group.id)
        : [];

      if (groupIds.length === 0) {
        throw new NotFoundException('Naujiena nerasta');
      }

      const membershipCount = await this.groupMembersRepository.count({
        where: { userId: normalizedUserId, groupId: In(groupIds) },
      });

      if (membershipCount === 0) {
        throw new NotFoundException('Naujiena nerasta');
      }
    }

    return this.mapPost(post);
  }

  async findOneForAdmin(id: string): Promise<NewsPostResponse> {
    const post = await this.newsRepository.findOne({
      where: { id },
      relations: { groups: true },
    });

    if (!post) {
      throw new NotFoundException('Naujiena nerasta');
    }

    return this.mapPost(post);
  }

  async listForAdmin(query: ListNewsQueryDto): Promise<PaginatedNewsResponse> {
    const { page, limit } = this.pagination.getPagination(query);
    const offset = (page - 1) * limit;

    try {
      const baseQuery = this.newsRepository.createQueryBuilder('news');

      const totalResult = await runWithDatabaseErrorHandling(
        () =>
          baseQuery
            .clone()
            .select('COUNT(DISTINCT news.id)', 'count')
            .getRawOne<{ count: string }>(),
        {
          message: 'Nepavyko gauti naujienų sąrašo',
          code: 'news_list_failed',
        },
      );

      const total = Number(totalResult?.count ?? 0);

      if (!Number.isFinite(total) || total <= 0) {
        return { ...this.pagination.buildResponse([], page, limit, 0), hasMore: false };
      }

      const rows = await runWithDatabaseErrorHandling(
        () =>
          baseQuery
            .clone()
            .select('news.id', 'id')
            .addSelect('news.createdAt', 'createdAt')
            .distinct(true)
            .orderBy('news.createdAt', 'DESC')
            .skip(offset)
            .take(limit + 1)
            .getRawMany<{ id: string }>(),
        {
          message: 'Nepavyko gauti naujienų sąrašo',
          code: 'news_list_failed',
        },
      );

      const ids = rows.slice(0, limit).map((row) => row.id);
      const hasMore = offset + ids.length < total;

      if (ids.length === 0) {
        return { ...this.pagination.buildResponse([], page, limit, total), hasMore };
      }

      const posts = await runWithDatabaseErrorHandling(
        () =>
          this.newsRepository.find({
            where: { id: In(ids) },
            relations: { groups: true },
          }),
        {
          message: 'Nepavyko gauti naujienų sąrašo',
          code: 'news_list_failed',
        },
      );

      return this.buildPaginationResult(posts, page, limit, hasMore, total);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        'Nepavyko gauti naujienų sąrašo',
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Įvyko nenumatyta klaida');
    }
  }

  async create(
    dto: CreateNewsDto,
    actor: { id: string; role: UserRole },
  ): Promise<NewsPostResponse | null> {
    const createNews = dto.createNews !== false;
    const title = createNews ? this.sanitizeTitle(dto.title ?? '') : '';
    const body = createNews ? this.sanitizeBody(dto.body ?? '') : '';
    const targetAll = dto.targetAll !== undefined ? dto.targetAll : true;

    const imageUrl = createNews ? this.sanitizeImageUrl(dto.imageUrl) : undefined;

    let groups: Group[] = [];

    if (!targetAll) {
      const providedIds = Array.isArray(dto.groupIds) ? dto.groupIds : [];
      if (providedIds.length === 0) {
        throw new BadRequestException('Pasirinkite bent vieną grupę');
      }
      groups = await this.resolveGroups(providedIds);
    }

    const attachTask = dto.attachTask === true;
    const createAssignment = (dto.createAssignment ?? attachTask) === true;

    if (!createNews && !createAssignment) {
      throw new BadRequestException('Būtina sukurti naujieną arba užduotį');
    }
    if (createAssignment && groups.length === 0) {
      throw new BadRequestException('Pridėkite bent vieną grupę, kad sukurtumėte užduotį');
    }

    const normalizedStartDate = this.normalizeDate(dto.assignmentStartDate);
    const normalizedDueDate = this.normalizeDate(dto.assignmentDueDate);
    const sendNotifications = dto.sendNotifications !== false;

    let full: NewsPost | null = null;
    let createdAssignments: Assignment[] = [];
    let assignmentTaskTitle: string | null = null;
    let assignmentStartLabel: string | null = null;
    let assignmentDueLabel: string | null = null;
    if (createNews) {
      const post = this.newsRepository.create({
        title,
        body,
        imageUrl: imageUrl === undefined ? null : imageUrl,
        targetAll,
        groups,
        assignmentStartDate: normalizedStartDate,
        assignmentDueDate: normalizedDueDate,
        sendNotifications,
      });

      const saved = await runWithDatabaseErrorHandling(
        () => this.newsRepository.save(post),
        { message: 'Nepavyko sukurti naujienos' },
      );
      full = await this.newsRepository.findOne({
        where: { id: saved.id },
        relations: { groups: true },
      });

      if (!full) {
        throw new NotFoundException('Naujiena nerasta');
      }
    }

    const newsId = full?.id ?? null;

    if (createAssignment) {
      if (!dto.templateId) {
        if (newsId) {
          await this.newsRepository.delete(newsId);
        }
        throw new BadRequestException('Pridėkite užduoties šabloną');
      }

      if (!dto.taskTitle?.trim()) {
        if (newsId) {
          await this.newsRepository.delete(newsId);
        }
        throw new BadRequestException('Užduoties pavadinimas privalomas');
      }

      const template = await this.templateRepository.findOne({
        where: { id: dto.templateId },
        relations: { steps: { taskStep: true } },
      });

      if (!template) {
        if (newsId) {
          await this.newsRepository.delete(newsId);
        }
        throw new NotFoundException('Šablonas nerastas');
      }

      const taskPayload: CreateTaskDto = {
        title: dto.taskTitle.trim(),
        steps: this.buildStepsFromTemplate(template),
      };

      const createdTask = await this.tasksService.create(taskPayload, actor);
      assignmentTaskTitle = createdTask.title;

      const startDate = normalizedStartDate ?? this.getTodayDateString();
      const dueDate =
        normalizedDueDate ??
        this.addDays(startDate, createdTask.defaultDueDays ?? 7);
      assignmentStartLabel = startDate;
      assignmentDueLabel = dueDate;

      const hiveIds = await this.collectAssignmentHives(groups.map((group) => group.id));

      if (!hiveIds.length) {
        if (newsId) {
          await this.newsRepository.delete(newsId);
        }
        throw new BadRequestException('Nepavyko rasti avilių pasirinktomis grupėmis');
      }

      try {
        const notifyAssignmentByEmail = !createNews && sendNotifications;
        createdAssignments = await Promise.all(
          hiveIds.map((hiveId) =>
            this.assignmentsService.create(
              {
                hiveId,
                taskId: createdTask.id,
                startDate,
                dueDate,
              },
              actor,
              { notify: notifyAssignmentByEmail },
            ),
          ),
        );
      } catch (error) {
        if (newsId) {
          await this.newsRepository.delete(newsId);
        }
        throw error;
      }

      if (full) {
        full.attachedTaskId = createdTask.id;
        full.assignmentStartDate = normalizedStartDate ?? null;
        full.assignmentDueDate = normalizedDueDate ?? null;
        full.sendNotifications = sendNotifications;
        await runWithDatabaseErrorHandling(
          () => this.newsRepository.save(full),
          { message: 'Nepavyko atnaujinti naujienos su užduotimi' },
        );
      }
    }

    if (createNews && full) {
      const recipientGroupIds = groups.map((group) => group.id);
      const recipients = await this.collectRecipientIds(targetAll, recipientGroupIds);

      const uniqueRecipients = Array.from(new Set(recipients)).filter(
        (recipientId) => recipientId !== actor.id,
      );

      const link = this.buildNewsLink(full.id);
      const emailCtaUrl = this.buildNewsListLink();
      const emailSnippet = this.buildEmailSnippet(body);
      const combinedRecipientIds = new Set<string>();
      const assignmentLinkByRecipient: Record<string, string> = {};

      if (createAssignment && createdAssignments.length) {
        const hiveIds = Array.from(new Set(createdAssignments.map((assignment) => assignment.hiveId)));
        const hives = await this.hiveRepository.find({
          where: { id: In(hiveIds) },
          relations: { members: true },
        });
        const hiveById = new Map(hives.map((hive) => [hive.id, hive]));

        for (const assignment of createdAssignments) {
          const hive = hiveById.get(assignment.hiveId);
          if (!hive) {
            continue;
          }
          const participants = new Set<string>();
          if (hive.ownerUserId) {
            participants.add(hive.ownerUserId);
          }
          for (const member of hive.members ?? []) {
            if (member.id) {
              participants.add(member.id);
            }
          }
          participants.forEach((participantId) => {
            if (!participantId || participantId === actor.id) {
              return;
            }
            if (!assignmentLinkByRecipient[participantId]) {
              assignmentLinkByRecipient[participantId] = assignment.id;
            }
          });
        }
      }

      if (createAssignment && Object.keys(assignmentLinkByRecipient).length) {
        uniqueRecipients.forEach((recipientId) => {
          if (assignmentLinkByRecipient[recipientId]) {
            combinedRecipientIds.add(recipientId);
          }
        });
      }

      if (
        combinedRecipientIds.size &&
        assignmentTaskTitle &&
        assignmentStartLabel &&
        assignmentDueLabel
      ) {
        await this.sendCombinedNewsAssignmentEmails({
          recipientIds: Array.from(combinedRecipientIds),
          newsTitle: title,
          newsBody: body,
          taskTitle: assignmentTaskTitle,
          startDate: assignmentStartLabel,
          dueDate: assignmentDueLabel,
          newsLink: link,
          assignmentLinksByRecipient: assignmentLinkByRecipient,
        });
      }

      for (const recipientId of uniqueRecipients) {
        try {
          await this.notifications.createNotification(recipientId, {
            type: 'news',
            title: `Paskelbta naujiena: ${title}`,
            body,
            link,
            sendEmail: !combinedRecipientIds.has(recipientId),
            emailSubject: 'Nauja naujiena',
            emailBody: `Paskelbta nauja naujiena "${title}"

${emailSnippet}`,
            emailCtaUrl,
          });
        } catch (error) {
          this.logger.warn(
            `Nepavyko sukurti naujienos pranešimo naudotojui ${recipientId}`,
            error instanceof Error ? error.stack : undefined,
          );
        }
      }
    }

    return full ? this.mapPost(full) : null;
  }
  async update(id: string, dto: UpdateNewsDto): Promise<NewsPostResponse> {
    const post = await this.newsRepository.findOne({
      where: { id },
      relations: { groups: true },
    });

    if (!post) {
      throw new NotFoundException('Naujiena nerasta');
    }

    const previousStartDate = post.assignmentStartDate;
    const previousDueDate = post.assignmentDueDate;

    if (dto.title !== undefined) {
      post.title = this.sanitizeTitle(dto.title);
    }

    if (dto.body !== undefined) {
      post.body = this.sanitizeBody(dto.body);
    }

    if (dto.targetAll !== undefined) {
      post.targetAll = dto.targetAll;
    }

    if (dto.assignmentStartDate !== undefined) {
      post.assignmentStartDate = this.normalizeDate(dto.assignmentStartDate);
    }

    if (dto.assignmentDueDate !== undefined) {
      post.assignmentDueDate = this.normalizeDate(dto.assignmentDueDate);
    }

    if (dto.sendNotifications !== undefined) {
      post.sendNotifications = dto.sendNotifications;
    }

    const normalizedImageUrl = this.sanitizeImageUrl(dto.imageUrl);
    if (normalizedImageUrl !== undefined) {
      post.imageUrl = normalizedImageUrl;
    }

    if (!post.targetAll) {
      const providedIds = Array.isArray(dto.groupIds)
        ? dto.groupIds
        : post.groups?.map((group) => group.id) ?? [];

      if (providedIds.length === 0) {
        throw new BadRequestException('Pasirinkite bent vieną grupę');
      }

      const groups = await this.resolveGroups(providedIds);
      post.groups = groups;
    } else {
      post.groups = [];
    }

    const saved = await runWithDatabaseErrorHandling(
      () => this.newsRepository.save(post),
      { message: 'Nepavyko atnaujinti naujienos' },
    );

    const startChanged =
      dto.assignmentStartDate !== undefined &&
      (previousStartDate ?? null) !== (saved.assignmentStartDate ?? null);
    const dueChanged =
      dto.assignmentDueDate !== undefined &&
      (previousDueDate ?? null) !== (saved.assignmentDueDate ?? null);

    if (saved.attachedTaskId && (startChanged || dueChanged)) {
      await this.assignmentsService.updateDatesByTask(saved.attachedTaskId, {
        startDate: startChanged ? saved.assignmentStartDate : undefined,
        dueDate: dueChanged ? saved.assignmentDueDate : undefined,
      });
    }

    return this.mapPost(saved);
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const post = await this.newsRepository.findOne({ where: { id } });

    if (!post) {
      throw new NotFoundException('Naujiena nerasta');
    }

    await this.newsRepository.remove(post);

    return { success: true };
  }

  private async sendCombinedNewsAssignmentEmails(params: {
    recipientIds: string[];
    newsTitle: string;
    newsBody: string;
    taskTitle: string;
    startDate: string;
    dueDate: string;
    newsLink: string;
    assignmentLinksByRecipient: Record<string, string>;
  }) {
    if (!params.recipientIds.length) {
      return;
    }

    const users = await this.usersRepository.find({
      where: { id: In(params.recipientIds) },
    });

    if (!users.length) {
      return;
    }

    const subject = 'Atėjo naujienos įrašas ir užduotis';
    const heading = 'Naujiena ir užduotis';

    await Promise.all(
      users.map(async (user) => {
        if (!user.email || user.role === UserRole.ADMIN) {
          return;
        }

        const assignmentId = params.assignmentLinksByRecipient[user.id];
        const assignmentLink = assignmentId
          ? this.buildAssignmentLink(assignmentId)
          : this.buildTasksLink();
        const html = this.buildCombinedEmailHtml(
          params,
          heading,
          params.newsLink,
          assignmentLink,
        );
        const text = this.buildCombinedEmailText(params, params.newsLink, assignmentLink);

        try {
          await this.emailService.sendMail({
            to: user.email,
            subject,
            mainHtml: html,
            text,
          });
        } catch (error) {
          this.logger.warn(
            `Nepavyko išsiųsti sujungto naujienos el. laiško vartotojui ${user.id}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }),
    );
  }

  private buildCombinedEmailSections(params: {
    newsTitle: string;
    newsBody: string;
    taskTitle: string;
    startDate: string;
    dueDate: string;
  }) {
    const newsLines = [
          `Paskelbtas naujienos įrašas "${params.newsTitle}".`,
      this.buildEmailSnippet(params.newsBody),
    ].filter((line) => line && line.length > 0);

    const taskLines = [
      `Jums priskirta užduotis "${params.taskTitle}".`,
      `Užduoties pradžia: ${params.startDate}.`,
      `Užduoties atlikimo terminas: ${params.dueDate}.`,
    ].filter((line) => line && line.length > 0);

    return { newsLines, taskLines };
  }

  private buildCombinedEmailHtml(
    params: {
      newsTitle: string;
      newsBody: string;
      taskTitle: string;
      startDate: string;
      dueDate: string;
    },
    heading: string,
    newsLink: string,
    assignmentLink: string,
  ) {
    const { newsLines, taskLines } = this.buildCombinedEmailSections(params);
    const paragraph = (line: string) =>
      `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px; color: #1f2933;">${this.escapeHtml(
        line,
      )}</p>`;
    const renderLines = (lines: string[]) => lines.map(paragraph).join('');
    const buttonStyle =
      'background-color: #0acb8b; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 9999px; font-weight: 600; font-size: 15px; display: inline-block;';

    return `<h1 style="font-size: 24px; line-height: 32px; margin: 0 0 24px 0; color: #111827;">${this.escapeHtml(
      heading,
    )}</h1>${renderLines(newsLines)}
      <div style="padding: 8px 0 4px 0; text-align: center;">
        <a href="${this.escapeAttribute(newsLink)}" style="${buttonStyle}">Skaityti naujieną</a>
      </div>
      <div style="border-top: 1px solid #e5e7eb; margin: 24px 0;"></div>
      ${renderLines(taskLines)}
      <div style="padding: 8px 0 0 0; text-align: center;">
        <a href="${this.escapeAttribute(assignmentLink)}" style="${buttonStyle}">Atidaryti užduotį</a>
      </div>`;
  }

  private buildCombinedButtonsHtml(newsLink: string, assignmentLink: string) {
    const buttonStyle =
      'background-color: #0acb8b; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 9999px; font-weight: 600; font-size: 15px; display: inline-block;';

    return `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td align="center" style="padding: 16px 0 8px 0;">
            <a href="${this.escapeAttribute(newsLink)}" style="${buttonStyle}">Skaityti naujieną</a>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 8px 0 0 0;">
            <a href="${this.escapeAttribute(assignmentLink)}" style="${buttonStyle}">Atidaryti užduotį</a>
          </td>
        </tr>
      </table>
    `;
  }

  private buildCombinedEmailText(
    params: {
      newsTitle: string;
      newsBody: string;
      taskTitle: string;
      startDate: string;
      dueDate: string;
    },
    newsLink: string,
    assignmentLink: string,
  ) {
    const { newsLines, taskLines } = this.buildCombinedEmailSections(params);
    return [
      ...newsLines,
      '',
      `Naujiena: ${newsLink}`,
      '',
      '----',
      '',
      ...taskLines,
      '',
      `Užduotis: ${assignmentLink}`,
    ].join('\n');
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private escapeAttribute(value: string) {

    return value.replace(/"/g, '%22');
  }

  private buildNewsLink(newsId: string) {
    const baseUrl = this.getFrontendBaseUrl();
    return `${baseUrl}/news/${newsId}`;
  }

  private buildNewsListLink() {
    const baseUrl = this.getFrontendBaseUrl();
    return `${baseUrl}/news`;
  }

  private buildTasksLink() {
    const baseUrl = this.getFrontendBaseUrl();
    return `${baseUrl}/tasks`;
  }

  private buildAssignmentLink(assignmentId: string) {
    const baseUrl = this.getFrontendBaseUrl();
    return `${baseUrl}/tasks/${assignmentId}`;
  }

  private getFrontendBaseUrl() {
    return (this.appBaseUrl ?? 'https://app.busmedaus.lt').replace(/\/$/, '');
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
}
