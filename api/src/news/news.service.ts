import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { NewsPost } from './news-post.entity';
import { Group } from '../groups/group.entity';
import { GroupMember } from '../groups/group-member.entity';
import { User } from '../users/user.entity';
import { MAILER_PORT, MailerPort } from '../notifications/mailer.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { ListNewsQueryDto } from './dto/list-news-query.dto';

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
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedNewsResponse {
  items: NewsPostResponse[];
  page: number;
  limit: number;
  hasMore: boolean;
}

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);

  constructor(
    @InjectRepository(NewsPost)
    private readonly newsRepository: Repository<NewsPost>,
    @InjectRepository(Group)
    private readonly groupsRepository: Repository<Group>,
    @InjectRepository(GroupMember)
    private readonly groupMembersRepository: Repository<GroupMember>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @Inject(MAILER_PORT)
    private readonly mailer: MailerPort,
  ) {}

  private normalizeLimit(limit?: number) {
    if (!limit || Number.isNaN(limit)) {
      return 10;
    }

    return Math.min(Math.max(limit, 1), 50);
  }

  private normalizePage(page?: number) {
    if (!page || Number.isNaN(page)) {
      return 1;
    }

    return Math.max(page, 1);
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

  private buildPaginationResult(
    posts: NewsPost[],
    page: number,
    limit: number,
    hasMore: boolean,
  ): PaginatedNewsResponse {
    const sorted = [...posts].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    return {
      items: sorted.map((post) => this.mapPost(post)),
      page,
      limit,
      hasMore,
    };
  }

  async listForUser(
    userId: string,
    query: ListNewsQueryDto,
  ): Promise<PaginatedNewsResponse> {
    const page = this.normalizePage(query.page);
    const limit = this.normalizeLimit(query.limit);
    const offset = (page - 1) * limit;

    const memberships = await this.groupMembersRepository.find({
      where: { userId },
      select: ['groupId'],
    });

    const groupIds = memberships.map((membership) => membership.groupId);

    const qb = this.newsRepository
      .createQueryBuilder('news')
      .select('news.id', 'id')
      .leftJoin('news.groups', 'group')
      .distinct(true)
      .orderBy('news.createdAt', 'DESC')
      .skip(offset)
      .take(limit + 1);

    if (groupIds.length > 0) {
      qb.where('news.targetAll = true OR group.id IN (:...groupIds)', {
        groupIds,
      });
    } else {
      qb.where('news.targetAll = true');
    }

    const rows = await qb.getRawMany<{ id: string }>();
    const ids = rows.slice(0, limit).map((row) => row.id);
    const hasMore = rows.length > limit;

    if (ids.length === 0) {
      return {
        items: [],
        page,
        limit,
        hasMore,
      };
    }

    const posts = await this.newsRepository.find({
      where: { id: In(ids) },
      relations: { groups: true },
    });

    return this.buildPaginationResult(posts, page, limit, hasMore);
  }

  async findOneForUser(id: string, userId: string): Promise<NewsPostResponse> {
    const post = await this.newsRepository.findOne({
      where: { id },
      relations: { groups: true },
    });

    if (!post) {
      throw new NotFoundException('Naujiena nerasta');
    }

    if (!post.targetAll) {
      const groupIds = Array.isArray(post.groups)
        ? post.groups.map((group) => group.id)
        : [];

      if (groupIds.length === 0) {
        throw new NotFoundException('Naujiena nerasta');
      }

      const membershipCount = await this.groupMembersRepository.count({
        where: { userId, groupId: In(groupIds) },
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
    const page = this.normalizePage(query.page);
    const limit = this.normalizeLimit(query.limit);
    const offset = (page - 1) * limit;

    const rows = await this.newsRepository
      .createQueryBuilder('news')
      .select('news.id', 'id')
      .orderBy('news.createdAt', 'DESC')
      .skip(offset)
      .take(limit + 1)
      .getRawMany<{ id: string }>();

    const ids = rows.slice(0, limit).map((row) => row.id);
    const hasMore = rows.length > limit;

    if (ids.length === 0) {
      return {
        items: [],
        page,
        limit,
        hasMore,
      };
    }

    const posts = await this.newsRepository.find({
      where: { id: In(ids) },
      relations: { groups: true },
    });

    return this.buildPaginationResult(posts, page, limit, hasMore);
  }

  async create(
    dto: CreateNewsDto,
    actor: { id: string },
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

    const post = this.newsRepository.create({
      title,
      body,
      imageUrl: imageUrl === undefined ? null : imageUrl,
      targetAll,
      groups,
    });

    const saved = await this.newsRepository.save(post);
    const full = await this.newsRepository.findOne({
      where: { id: saved.id },
      relations: { groups: true },
    });

    if (!full) {
      throw new NotFoundException('Naujiena nerasta');
    }

    const recipientGroupIds = groups.map((group) => group.id);
    const recipients = await this.collectRecipientIds(targetAll, recipientGroupIds);

    const uniqueRecipients = Array.from(new Set(recipients)).filter(
      (recipientId) => recipientId !== actor.id,
    );

    for (const recipientId of uniqueRecipients) {
      try {
        await this.mailer.send({
          userId: recipientId,
          subject: `Nauja naujiena: ${title}`,
          body,
          notificationType: 'news_post',
          payload: { postId: full.id },
        });
      } catch (error) {
        this.logger.warn(
          `Nepavyko išsiųsti naujienos pranešimo naudotojui ${recipientId}`,
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

    const saved = await this.newsRepository.save(post);

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
}
