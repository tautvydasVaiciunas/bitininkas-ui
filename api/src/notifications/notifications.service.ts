import { Inject, Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';

import { Notification } from './notification.entity';
import {
  DEFAULT_CTA_LABEL,
  renderNotificationEmailHtml,
  renderNotificationEmailText,
} from '../email/email-template';
import { EmailService } from '../email/email.service';
import { User, UserRole } from '../users/user.entity';
import { ConfigService } from '@nestjs/config';
import { resolveFrontendUrl } from '../common/utils/frontend-url';
import {
  PaginationService,
  PaginatedResult,
  PaginationOptions,
} from '../common/pagination/pagination.service';

export type NotificationType =
  | 'assignment'
  | 'news'
  | 'message'
  | 'hive_history'
  | 'hive_assignment'
  | 'store_order';

export interface CreateNotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  link?: string | null;
  sendEmail?: boolean;
  emailSubject?: string;
  emailBody?: string;
  emailCtaUrl?: string | null;
  emailCtaLabel?: string;
}

type RawNotificationRow = Record<string, unknown>;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private schemaCapabilities?: {
    hasTable: boolean;
    hasIsReadColumn: boolean;
    hasReadAtColumn: boolean;
    hasCreatedAtColumn: boolean;
  };

  constructor(
    @InjectRepository(Notification)
    private readonly repository: Repository<Notification>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly emailService: EmailService,
    private readonly pagination: PaginationService,
    private readonly configService: ConfigService,
  ) {}

  private async getSchemaCapabilities() {
    if (!this.schemaCapabilities) {
      try {
        const rows = await this.repository.query(
          `SELECT column_name
           FROM information_schema.columns
           WHERE table_name = 'notifications'
             AND table_schema = current_schema()`,
        );

        const columns = (rows as RawNotificationRow[])
          .map((row) => {
            const value = row.column_name ?? Object.values(row)[0];
            return typeof value === 'string' ? value.toLowerCase() : null;
          })
          .filter((value): value is string => Boolean(value));

        const hasTable = columns.length > 0;

        this.schemaCapabilities = {
          hasTable,
          hasIsReadColumn: hasTable && columns.includes('is_read'),
          hasReadAtColumn: hasTable && columns.includes('read_at'),
          hasCreatedAtColumn: hasTable && columns.includes('created_at'),
        };
      } catch (error) {
        if (error instanceof QueryFailedError) {
          this.schemaCapabilities = {
            hasTable: false,
            hasIsReadColumn: false,
            hasReadAtColumn: false,
            hasCreatedAtColumn: false,
          };
        } else {
          throw error;
        }
      }
    }

    return this.schemaCapabilities;
  }

  private parseLimit(input?: number) {
    const DEFAULT_LIMIT = 10;
    const MAX_LIMIT = 100;
    const value = Number(input);

    if (!Number.isFinite(value)) {
      return DEFAULT_LIMIT;
    }

    const normalized = Math.floor(value);

    if (normalized < 1) {
      return DEFAULT_LIMIT;
    }

    return normalized > MAX_LIMIT ? MAX_LIMIT : normalized;
  }

  private parsePage(input?: number) {
    const DEFAULT_PAGE = 1;
    const value = Number(input);

    if (!Number.isFinite(value)) {
      return DEFAULT_PAGE;
    }

    const normalized = Math.floor(value);
    return normalized >= 1 ? normalized : DEFAULT_PAGE;
  }

  private handleQueryError(error: unknown): never {
    if (error instanceof QueryFailedError) {
      throw new BadRequestException('Neteisinga užklausa');
    }

    throw error;
  }

  private mapRawNotification(row: RawNotificationRow): Notification {
    const notification = new Notification();
    notification.id = String(row.id);
    notification.userId = String(row.user_id);
    notification.type = (typeof row.type === 'string' ? row.type : 'message') as NotificationType;
    notification.title = typeof row.title === 'string' ? row.title : String(row.title ?? '');
    notification.body = typeof row.body === 'string' ? row.body : String(row.body ?? '');

    if (typeof row.link === 'string') {
      notification.link = row.link;
    } else if (row.link === null) {
      notification.link = null;
    } else {
      notification.link = null;
    }

    if (typeof row.is_read === 'boolean') {
      notification.isRead = row.is_read;
    } else if (typeof row.is_read === 'number') {
      notification.isRead = row.is_read === 1;
    } else if (typeof row.is_read === 'string') {
      const normalized = row.is_read.toLowerCase();
      notification.isRead = normalized === 't' || normalized === 'true' || normalized === '1';
    } else {
      notification.isRead = row.read_at !== undefined && row.read_at !== null;
    }

    const createdAt = row.created_at;
    notification.createdAt =
      createdAt instanceof Date ? createdAt : new Date(String(createdAt ?? new Date().toISOString()));

    return notification;
  }

  async createNotification(
    userId: string,
    payload: CreateNotificationPayload,
  ): Promise<Notification | null> {
    const capabilities = await this.getSchemaCapabilities();

    if (!capabilities.hasTable) {
      this.logger.warn('Skipping notification creation: notifications table is not available.');
      return null;
    }

    try {
      if (capabilities.hasIsReadColumn) {
        const notificationLink = payload.link
          ? resolveFrontendUrl(this.configService, payload.link)
          : null;
        const notification = this.repository.create({
          userId,
          type: payload.type,
          title: payload.title,
          body: payload.body,
          link: notificationLink,
          isRead: false,
        });

        const saved = await this.repository.save(notification);

        if (payload.sendEmail) {
          await this.sendEmailNotification(userId, payload);
        }

        return saved;
      }

      if (capabilities.hasReadAtColumn) {
        const notificationLink = payload.link
          ? resolveFrontendUrl(this.configService, payload.link)
          : null;
        const [row] = (await this.repository.query(
          `INSERT INTO notifications (user_id, type, title, body, link, read_at)
           VALUES ($1, $2, $3, $4, $5, NULL)
           RETURNING id, user_id, type, title, body, link, read_at, created_at`,
          [userId, payload.type, payload.title, payload.body, notificationLink],
        )) as RawNotificationRow[];

        if (!row) {
          throw new Error('Failed to insert notification without is_read column.');
        }

        const saved = this.mapRawNotification(row);

        if (payload.sendEmail) {
          await this.sendEmailNotification(userId, payload);
        }

        return saved;
      }

        const notificationLink = payload.link
          ? resolveFrontendUrl(this.configService, payload.link)
          : null;
        const [row] = (await this.repository.query(
        `INSERT INTO notifications (user_id, type, title, body, link)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, user_id, type, title, body, link, created_at`,
        [userId, payload.type, payload.title, payload.body, notificationLink],
      )) as RawNotificationRow[];

      if (!row) {
        throw new Error('Failed to insert notification without read tracking columns.');
      }

      const saved = this.mapRawNotification(row);

      if (payload.sendEmail) {
        await this.sendEmailNotification(userId, payload);
      }

      return saved;
    } catch (error) {
      this.handleQueryError(error);
    }

    return null;
  }

  async list(
    userId: string,
    options: PaginationOptions = {},
  ): Promise<PaginatedResult<Notification>> {
    const capabilities = await this.getSchemaCapabilities();
    const limit = this.parseLimit(options.limit);
    const page = this.parsePage(options.page);

    if (!capabilities.hasTable) {
      return this.pagination.buildResponse([], page, limit, 0);
    }

    try {
      const offset = (page - 1) * limit;
      const columns = ['id', 'user_id', 'type', 'title', 'body', 'link'];
      if (capabilities.hasIsReadColumn) {
        columns.push('is_read');
      }
      if (capabilities.hasReadAtColumn) {
        columns.push('read_at');
      }
      if (capabilities.hasCreatedAtColumn) {
        columns.push('created_at');
      }

      const orderColumn = capabilities.hasCreatedAtColumn ? 'created_at' : 'id';

      const rows = (await this.repository.query(
        `SELECT ${columns.join(', ')}
         FROM notifications
         WHERE user_id = $1
         ORDER BY ${orderColumn} DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset],
      )) as RawNotificationRow[];

      const totalResult = (await this.repository.query(
        `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1`,
        [userId],
      )) as RawNotificationRow[];

      const total = Number(totalResult?.[0]?.count ?? 0);
      const items = rows.map((row) => this.mapRawNotification(row));

      return this.pagination.buildResponse(items, page, limit, total);
    } catch (error) {
      this.handleQueryError(error);
    }

    return this.pagination.buildResponse([], page, limit, 0);
  }

  async countUnreadForUser(userId: string) {
    const capabilities = await this.getSchemaCapabilities();

    if (!capabilities.hasTable) {
      return 0;
    }

    try {
      if (capabilities.hasIsReadColumn) {
        const result = (await this.repository.query(
          `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = false`,
          [userId],
        )) as RawNotificationRow[];

        return Number(result?.[0]?.count ?? 0);
      }

      if (capabilities.hasReadAtColumn) {
        const result = (await this.repository.query(
          `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND read_at IS NULL`,
          [userId],
        )) as RawNotificationRow[];

        return Number(result?.[0]?.count ?? 0);
      }

      return 0;
    } catch (error) {
      this.handleQueryError(error);
    }

    return 0;
  }

  async markAsRead(id: string, userId: string) {
    const capabilities = await this.getSchemaCapabilities();

    if (!capabilities.hasTable) {
      return;
    }

    if (capabilities.hasIsReadColumn) {
      const notification = await this.repository.findOne({ where: { id, userId } });

      if (!notification) {
        throw new NotFoundException('Notification not found');
      }

      if (!notification.isRead) {
        notification.isRead = true;
        await this.repository.save(notification);
      }

      return;
    }

    try {
      if (capabilities.hasReadAtColumn) {
        const [existing] = (await this.repository.query(
          `SELECT id, read_at FROM notifications WHERE id = $1 AND user_id = $2 LIMIT 1`,
          [id, userId],
        )) as RawNotificationRow[];

        if (!existing) {
          throw new NotFoundException('Notification not found');
        }

        if (existing.read_at === null) {
          await this.repository.query(
            `UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2 AND read_at IS NULL`,
            [id, userId],
          );
        }

        return;
      }
    } catch (error) {
      this.handleQueryError(error);
    }
  }

  async markAllAsRead(userId: string) {
    const capabilities = await this.getSchemaCapabilities();

    if (!capabilities.hasTable) {
      return;
    }

    if (capabilities.hasIsReadColumn) {
      await this.repository.update({ userId, isRead: false }, { isRead: true });
      return;
    }

    try {
      if (capabilities.hasReadAtColumn) {
        await this.repository.query(
          `UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL`,
          [userId],
        );
        return;
      }
    } catch (error) {
      this.handleQueryError(error);
    }
  }

  private async sendEmailNotification(
    userId: string,
    payload: CreateNotificationPayload,
  ) {
    try {
      const user = await this.usersRepository.findOne({ where: { id: userId } });

      if (!user?.email) {
        this.logger.warn(
          `Nepavyko išsiųsti el. laiško vartotojui ${userId}: nėra el. pašto adreso.`,
        );
        return;
      }

      if (payload.type === 'assignment' && user.role === UserRole.ADMIN) {
        this.logger.debug(
          `Praleidžiamas el. laiškas admin vartotojui ${user.email} apie užduotį.`,
        );
        return;
      }

      const subject = payload.emailSubject ?? payload.title;
      const message = payload.emailBody ?? payload.body;
      const rawCta = payload.emailCtaUrl ?? payload.link ?? null;
      const ctaUrl = rawCta ? resolveFrontendUrl(this.configService, rawCta) : null;
      const ctaLabel = payload.emailCtaLabel ?? DEFAULT_CTA_LABEL;

      const html = renderNotificationEmailHtml({
        subject,
        message,
        ctaUrl,
      });
      const text = renderNotificationEmailText({
        message,
        ctaUrl: ctaUrl ?? undefined,
      });

      await this.emailService.sendMail({
        to: user.email,
        subject,
        html,
        primaryButtonLabel: ctaUrl ? ctaLabel : null,
        primaryButtonUrl: ctaUrl ?? null,
        text,
      });
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to send notification email to user ${userId}: ${details}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
