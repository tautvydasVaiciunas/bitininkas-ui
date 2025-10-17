import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Notification } from './notification.entity';
import {
  DEFAULT_CTA_LABEL,
  renderNotificationEmailHtml,
  renderNotificationEmailText,
} from './email-template';
import { MAILER_SERVICE, MailerService } from './mailer.service';
import { User, UserRole } from '../users/user.entity';
import {
  PaginationService,
  PaginatedResult,
  PaginationOptions,
} from '../common/pagination/pagination.service';

export type NotificationType = 'assignment' | 'news' | 'message';

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

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly repository: Repository<Notification>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @Inject(MAILER_SERVICE)
    private readonly mailer: MailerService,
    private readonly pagination: PaginationService,
  ) {}

  async createNotification(userId: string, payload: CreateNotificationPayload) {
    const notification = this.repository.create({
      userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      link: payload.link ?? null,
      isRead: false,
    });

    const saved = await this.repository.save(notification);

    if (payload.sendEmail) {
      await this.sendEmailNotification(userId, payload);
    }

    return saved;
  }

  async list(
    userId: string,
    options: PaginationOptions = {},
  ): Promise<PaginatedResult<Notification>> {
    const { page, limit } = this.pagination.getPagination(options);

    const [items, total] = await this.repository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return this.pagination.buildResponse(items, page, limit, total);
  }

  async countUnreadForUser(userId: string) {
    return this.repository.count({ where: { userId, isRead: false } });
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.repository.findOne({ where: { id, userId } });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (!notification.isRead) {
      notification.isRead = true;
      await this.repository.save(notification);
    }
  }

  async markAllAsRead(userId: string) {
    await this.repository.update({ userId, isRead: false }, { isRead: true });
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
      const ctaUrl = payload.emailCtaUrl ?? payload.link ?? null;
      const ctaLabel = payload.emailCtaLabel ?? DEFAULT_CTA_LABEL;

      const html = renderNotificationEmailHtml({
        subject,
        message,
        ctaUrl,
        ctaLabel,
      });
      const text = renderNotificationEmailText({
        message,
        ctaUrl: ctaUrl ?? undefined,
        ctaLabel,
      });

      await this.mailer.sendNotificationEmail(user.email, subject, html, text);
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to send notification email to user ${userId}: ${details}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
