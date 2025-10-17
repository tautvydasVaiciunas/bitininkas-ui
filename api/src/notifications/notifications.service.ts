import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Notification } from './notification.entity';
import { MAILER_PORT, MailerPort } from './mailer.service';

export type NotificationType = 'assignment' | 'news' | 'message';

export interface CreateNotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  link?: string | null;
  sendEmail?: boolean;
  emailSubject?: string;
  emailBody?: string;
}

export interface ListNotificationsOptions {
  page?: number;
  limit?: number;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly repository: Repository<Notification>,
    @Inject(MAILER_PORT)
    private readonly mailer: MailerPort,
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
      try {
        await this.mailer.send({
          userId,
          subject: payload.emailSubject ?? payload.title,
          body: payload.emailBody ?? this.composeEmailBody(payload.body, payload.link),
          link: payload.link ?? undefined,
        });
      } catch (error) {
        const details = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Failed to send notification email to user ${userId}: ${details}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    return saved;
  }

  async list(userId: string, options: ListNotificationsOptions = {}) {
    const limit = this.normalizeLimit(options.limit);
    const page = this.normalizePage(options.page);

    return this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
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

  private composeEmailBody(body: string, link?: string | null) {
    if (!link) {
      return body;
    }

    return `${body}\n\nNuoroda: ${link}`;
  }

  private normalizeLimit(value?: number) {
    if (!value || Number.isNaN(value)) {
      return 20;
    }

    return Math.min(Math.max(value, 1), 100);
  }

  private normalizePage(value?: number) {
    if (!value || Number.isNaN(value)) {
      return 1;
    }

    return Math.max(value, 1);
  }
}
