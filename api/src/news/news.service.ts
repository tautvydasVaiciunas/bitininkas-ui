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
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { ListNewsQueryDto } from './dto/list-news-query.dto';
import { runWithDatabaseErrorHandling } from '../common/errors/database-error.util';
import {
  PaginationService,
  PaginatedResult,
} from '../common/pagination/pagination.service';
import { AssignmentsService } from '../assignments/assignments.service';
import { Task } from '../tasks/task.entity';
import { Hive } from '../hives/hive.entity';

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
    private readonly notifications: NotificationsService,
    private readonly configService: ConfigService,
    private readonly pagination: PaginationService,
    private readonly assignmentsService: AssignmentsService,
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

    const ownerIds = Array.from(new Set(memberships.map((membership) => membership.userId)));
    const explicitHiveIds = Array.from(
      new Set(
        memberships
          .map((membership) => membership.hiveId)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    const where: FindOptionsWhere<Hive>[] = [];
    if (explicitHiveIds.length) {
      where.push({ id: In(explicitHiveIds) });
    }
    if (ownerIds.length) {
      where.push({ ownerUserId: In(ownerIds) });
    }

    if (!where.length) {
      return [];
    }

    const hives = await this.hiveRepository.find({ where });
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
  ): Promise<NewsPostResponse> {
    const title = this.sanitizeTitle(dto.title);
    const body = this.sanitizeBody(dto.body);
    const targetAll = dto.targetAll !== undefined ? dto.targetAll : true;

    const imageUrl = this.sanitizeImageUrl(dto.imageUrl);

    let groups: Group[] = [];

    if (!targetAll) {
      const providedIds = Array.isArray(dto.groupIds) ? dto.groupIds : [];
      if (providedIds.length === 0) {
        throw new BadRequestException('Pasirinkite bent vieną grupę');
      }
      groups = await this.resolveGroups(providedIds);
    }

    const attachedTaskId = dto.attachedTaskId?.trim() ?? null;
    const assignmentStartDate = this.normalizeDate(dto.assignmentStartDate);
    const assignmentDueDate = this.normalizeDate(dto.assignmentDueDate);
    const sendNotifications = dto.sendNotifications !== false;

    let assignmentConfiguration:
      | {
          hiveIds: string[];
          startDate: string;
          dueDate: string;
        }
      | null = null;

    if (attachedTaskId) {
      if (!groups.length) {
        throw new BadRequestException('Pridėkite bent vieną grupę, kad sukurtumėte užduotį');
      }

      const task = await this.taskRepository.findOne({ where: { id: attachedTaskId } });
      if (!task) {
        throw new NotFoundException('Užduoties šablonas nerastas');
      }

      const hiveIds = await this.collectAssignmentHives(groups.map((group) => group.id));
      if (!hiveIds.length) {
        throw new BadRequestException('Nepavyko rasti avilių pasirinktomis grupėmis');
      }

      const startDateValue = assignmentStartDate ?? this.getTodayDateString();
      const dueDateValue =
        assignmentDueDate ?? this.addDays(startDateValue, task.defaultDueDays);

      assignmentConfiguration = {
        hiveIds,
        startDate: startDateValue,
        dueDate: dueDateValue,
      };
    }

    const post = this.newsRepository.create({
      title,
      body,
      imageUrl: imageUrl === undefined ? null : imageUrl,
      targetAll,
      groups,
      attachedTaskId,
      assignmentStartDate,
      assignmentDueDate,
      sendNotifications,
    });

    const saved = await runWithDatabaseErrorHandling(
      () => this.newsRepository.save(post),
      { message: 'Nepavyko sukurti naujienos' },
    );
    const full = await this.newsRepository.findOne({
      where: { id: saved.id },
      relations: { groups: true },
    });

    if (!full) {
      throw new NotFoundException('Naujiena nerasta');
    }

    if (assignmentConfiguration) {
      try {
        await Promise.all(
          assignmentConfiguration.hiveIds.map((hiveId) =>
              this.assignmentsService.create(
                {
                  hiveId,
                  taskId: attachedTaskId!,
                  startDate: assignmentConfiguration.startDate,
                  dueDate: assignmentConfiguration.dueDate,
                },
              actor,
              { notify: sendNotifications },
            ),
          ),
        );
      } catch (error) {
        await this.newsRepository.delete(saved.id);
        throw error;
      }
    }

    const recipientGroupIds = groups.map((group) => group.id);
    const recipients = await this.collectRecipientIds(targetAll, recipientGroupIds);

    const uniqueRecipients = Array.from(new Set(recipients)).filter(
      (recipientId) => recipientId !== actor.id,
    );

    const link = this.buildNewsLink(full.id);
    const emailCtaUrl = this.buildNewsListLink();

    for (const recipientId of uniqueRecipients) {
      try {
        await this.notifications.createNotification(recipientId, {
          type: 'news',
          title: `Nauja naujiena: ${title}`,
          body,
          link,
          sendEmail: true,
          emailSubject: 'Nauja naujiena',
          emailBody: `Paskelbta nauja naujiena "${title}"

${body}`,
          emailCtaUrl,
        });
      } catch (error) {
        this.logger.warn(
          `Nepavyko sukurti naujienos pranešimo naudotojui ${recipientId}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    return this.mapPost(full);
  }
  async update(id: string, dto: UpdateNewsDto): Promise<NewsPostResponse> {
    const post = await this.newsRepository.findOne({
      where: { id },
      relations: { groups: true },
    });

    if (!post) {
      throw new NotFoundException('Naujiena nerasta');
    }

    if (dto.title !== undefined) {
      post.title = this.sanitizeTitle(dto.title);
    }

    if (dto.body !== undefined) {
      post.body = this.sanitizeBody(dto.body);
    }

    if (dto.targetAll !== undefined) {
      post.targetAll = dto.targetAll;
    }

    if (dto.attachedTaskId !== undefined) {
      post.attachedTaskId = dto.attachedTaskId?.trim() ?? null;
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

  private buildNewsLink(newsId: string) {
    if (this.appBaseUrl) {
      return `${this.appBaseUrl}/news/${newsId}`;
    }

    return `/news/${newsId}`;
  }

  private buildNewsListLink() {
    if (this.appBaseUrl) {
      return `${this.appBaseUrl}/news`;
    }

    return `/news`;
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
