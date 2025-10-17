import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Not, Repository } from 'typeorm';

import { Assignment, AssignmentStatus } from './assignment.entity';
import { Notification } from '../notifications/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { DEFAULT_CTA_LABEL } from '../notifications/email-template';

@Injectable()
export class AssignmentsScheduler {
  private readonly logger = new Logger(AssignmentsScheduler.name);
  private readonly appBaseUrl: string | null;

  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentsRepository: Repository<Assignment>,
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {
    this.appBaseUrl = this.normalizeBaseUrl(
      this.configService.get<string>('APP_URL') ??
        this.configService.get<string>('FRONTEND_URL') ??
        null,
    );
  }

  @Cron('5 0 * * *', { timeZone: 'UTC' })
  async handleDailyReminders() {
    const today = this.getTodayUtc();

    await this.sendDueSoonReminders(today);
    await this.sendOverdueReminders(today);
  }

  private async sendDueSoonReminders(today: Date) {
    const targetDate = this.formatDate(this.addDays(today, 7));

    try {
      const assignments = await this.assignmentsRepository.find({
        where: {
          dueDate: targetDate,
          status: Not(AssignmentStatus.DONE),
        },
        relations: { hive: { owner: true }, task: true },
      });

      for (const assignment of assignments) {
        const taskTitle = assignment.task?.title ?? 'Užduotis';
        await this.notifyAssignment(
          assignment,
          `Priminimas: liko 7 dienos iki „${taskTitle}“`,
          'Primename: iki užduoties liko 7 dienos',
        );
      }
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Nepavyko apdoroti 7 dienų priminimų: ${details}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async sendOverdueReminders(today: Date) {
    const todayLabel = this.formatDate(today);

    try {
      const assignments = await this.assignmentsRepository.find({
        where: {
          dueDate: LessThan(todayLabel),
          status: Not(AssignmentStatus.DONE),
        },
        relations: { hive: { owner: true }, task: true },
      });

      for (const assignment of assignments) {
        const taskTitle = assignment.task?.title ?? 'Užduotis';
        await this.notifyAssignment(
          assignment,
          `Praleista užduotis: ${taskTitle}`,
          'Praleista užduotis',
        );
      }
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Nepavyko apdoroti praleistų užduočių pranešimų: ${details}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async notifyAssignment(
    assignment: Assignment,
    subject: string,
    intro: string,
  ) {
    const ownerId = assignment.hive?.ownerUserId ?? assignment.hive?.owner?.id;

    if (!ownerId) {
      this.logger.warn(
        `Praleidžiama užduotis ${assignment.id}, nes nerastas bitininkas`,
      );
      return;
    }

    const link = this.buildAssignmentLink(assignment.id);
    const alreadySent = await this.hasNotification(ownerId, subject, link);

    if (alreadySent) {
      return;
    }

    const taskTitle = assignment.task?.title ?? 'Užduotis';
    const body = [
      intro,
      `Pavadinimas: ${taskTitle}`,
      `Terminas: ${assignment.dueDate}`,
      `Nuoroda: ${link}`,
    ].join('\n');

    try {
      await this.notificationsService.createNotification(ownerId, {
        type: 'assignment',
        title: subject,
        body,
        link,
        sendEmail: true,
        emailSubject: subject,
        emailBody: body,
        emailCtaUrl: this.buildAssignmentEmailLink(assignment.id),
        emailCtaLabel: DEFAULT_CTA_LABEL,
      });
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Nepavyko sukurti pranešimo užduočiai ${assignment.id}: ${details}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async hasNotification(userId: string, title: string, link: string) {
    try {
      const count = await this.notificationsRepository
        .createQueryBuilder('notification')
        .where('notification.userId = :userId', { userId })
        .andWhere('notification.title = :title', { title })
        .andWhere('notification.link = :link', { link })
        .getCount();

      return count > 0;
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Nepavyko patikrinti ar pranešimas jau išsiųstas: ${details}`,
        error instanceof Error ? error.stack : undefined,
      );

      return false;
    }
  }

  private getTodayUtc() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  private addDays(date: Date, days: number) {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
  }

  private formatDate(value: Date) {
    return value.toISOString().slice(0, 10);
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
}
