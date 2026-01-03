import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, LessThan, Not, Repository } from 'typeorm';

import { Assignment, AssignmentStatus } from './assignment.entity';
import { Notification } from '../notifications/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import {
  DEFAULT_CTA_LABEL,
  renderNotificationEmailHtml,
  renderNotificationEmailText,
} from '../email/email-template';
import { MAILER_SERVICE, MailerService } from '../notifications/mailer.service';
import { GroupMember } from '../groups/group-member.entity';
import { User, UserRole } from '../users/user.entity';
import { EmailService } from '../email/email.service';

const WEEKLY_REMINDER_CRON = process.env.REMINDER_CRON ?? '0 9 * * 1';

@Injectable()
export class AssignmentsScheduler {
  private readonly logger = new Logger(AssignmentsScheduler.name);
  private readonly appBaseUrl: string | null;

  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentsRepository: Repository<Assignment>,
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
    @InjectRepository(GroupMember)
    private readonly groupMembersRepository: Repository<GroupMember>,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
    @Inject(MAILER_SERVICE)
    private readonly mailer: MailerService,
    private readonly emailService: EmailService,
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

    await this.sendStartDateReminders(today);
    await this.sendDueSoonReminders(today);
    await this.sendOverdueReminders(today);
  }

  private async sendStartDateReminders(today: Date) {
    const todayLabel = this.formatDate(today);

    try {
      const assignments = await this.assignmentsRepository.find({
        where: {
          startDate: todayLabel,
          status: Not(AssignmentStatus.DONE),
          notifiedStart: false,
        },
        relations: { hive: { owner: true, members: true }, task: true },
      });

      for (const assignment of assignments) {
        const taskTitle = assignment.task?.title ?? 'Užduotis';
        await this.notifyAssignment(
          assignment,
          `Užduotis jau aktyvi: ${taskTitle}`,
          'Užduotis jau aktyvi',
        );
        await this.markStartNotified(assignment);
        await this.sendStartEmail(assignment);
      }
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Nepavyko apdoroti aktyvacijos priminimų: ${details}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  @Cron(WEEKLY_REMINDER_CRON)
  async handleWeeklyReminders() {
    const today = this.getTodayUtc();
    const todayLabel = this.formatDate(today);

    try {
      const assignments = await this.assignmentsRepository
        .createQueryBuilder('assignment')
        .leftJoinAndSelect('assignment.hive', 'hive')
        .leftJoinAndSelect('assignment.task', 'task')
        .where('assignment.status != :done', { done: AssignmentStatus.DONE })
        .andWhere(
          new Brackets((qb) => {
            qb.where(
              '(assignment.startDate IS NULL OR assignment.startDate <= :today) AND assignment.dueDate >= :today',
              { today: todayLabel },
            );
            qb.orWhere('assignment.dueDate < :today', { today: todayLabel });
          }),
        )
        .getMany();

      for (const assignment of assignments) {
        await this.notifyWeeklyReminder(assignment, todayLabel);
      }
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Nepavyko apdoroti savaitinio priminimo: ${details}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async sendDueSoonReminders(today: Date) {
    const targetDate = this.formatDate(this.addDays(today, 3));

    try {
      const assignments = await this.assignmentsRepository.find({
        where: {
          dueDate: targetDate,
          status: Not(AssignmentStatus.DONE),
          notifiedDueSoon: false,
        },
        relations: {
          hive: { owner: true, members: true },
          task: { steps: true },
        },
      });

        for (const assignment of assignments) {
          const taskTitle = assignment.task?.title ?? 'Užduotis';
          await this.notifyAssignment(
            assignment,
            `Liko savaitė iki ${taskTitle}`,
            'Primename: liko savaitė',
          );
          await this.sendDueSoonEmail(assignment);
          await this.markDueSoonNotified(assignment);
        }
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Nepavyko apdoroti 7 dienų priminimų: ${details}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async notifyWeeklyReminder(assignment: Assignment, todayLabel: string) {
    const hive = assignment.hive;
    const ownerId = hive?.ownerUserId;

    if (!ownerId) {
      this.logger.warn(
        `Praleidžiama savaitinio priminimo užduotis ${assignment.id}, nes nerastas avilio savininkas`,
      );
      return;
    }

    const ownerMemberships = await this.groupMembersRepository.find({
      where: { userId: ownerId },
    });

    const groupIds = ownerMemberships.map((membership) => membership.groupId);

    if (!groupIds.length) {
      this.logger.debug(
        `Vartotojas ${ownerId} nepriklauso jokiai grupei — savaitinis priminimas nekuriamas`,
      );
      return;
    }

    const memberRows = await this.groupMembersRepository
      .createQueryBuilder('membership')
      .innerJoinAndSelect('membership.user', 'memberUser')
      .where('membership.groupId IN (:...groupIds)', { groupIds })
      .andWhere('memberUser.role != :adminRole', { adminRole: UserRole.ADMIN })
      .getMany();

    if (!memberRows.length) {
      this.logger.debug(
        `Nerasta tinkamų gavėjų užduočiai ${assignment.id} savaitiniam priminimui`,
      );
      return;
    }

    const subject = 'Priminimas: nebaigta užduotis';
    const taskTitle = assignment.task?.title ?? 'Užduotis';
    const link = this.buildAssignmentLink(assignment.id);
    const emailLink = this.buildAssignmentEmailLink(assignment.id);
    const overdue = assignment.dueDate < todayLabel;
    const lines = [
      `Užduotis „${taskTitle}“ vis dar nebaigta.`,
      `Terminas: ${assignment.dueDate}`,
    ];

    if (overdue) {
      lines.push('Užduotis jau praleista.');
    }

    lines.push(`Nuoroda: ${link}`);
    const message = lines.join('\n');

    const html = renderNotificationEmailHtml({
      subject,
      message,
      ctaUrl: emailLink,
    });
    const text = renderNotificationEmailText({
      message,
      ctaUrl: emailLink,
    });

    const notifiedEmails = new Set<string>();

    for (const membership of memberRows) {
      const user = membership.user;
      if (!user) {
        continue;
      }

      const alreadySent = await this.hasNotification(user.id, subject, link);
      if (alreadySent) {
        continue;
      }

      try {
        await this.notificationsService.createNotification(user.id, {
          type: 'assignment',
          title: subject,
          body: message,
          link,
        });

        if (user.email) {
          notifiedEmails.add(user.email);
        }
      } catch (error) {
        const details = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Nepavyko sukurti savaitinio priminimo pranešimo vartotojui ${user.id}: ${details}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    if (notifiedEmails.size === 0) {
      return;
    }

    try {
      await this.mailer.sendBulkNotificationEmail(
        Array.from(notifiedEmails),
        subject,
        html,
        text,
      );
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Nepavyko išsiųsti savaitinio priminimo el. laiškų užduočiai ${assignment.id}: ${details}`,
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
          `Užduotis vėluoja: ${taskTitle}`,
          'Užduoties vykdymo laikas pasibaigė, atlikite užduotį kuo greičiau!',
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
    const baseUrl = (this.appBaseUrl ?? 'https://app.busmedaus.lt').replace(/\/$/, '');
    return `${baseUrl}/tasks/${assignmentId}/preview`;
  }

  private buildAssignmentEmailLink(assignmentId: string) {
    const baseUrl = (this.appBaseUrl ?? 'https://app.busmedaus.lt').replace(/\/$/, '');
    return `${baseUrl}/tasks/${assignmentId}`;
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

  private async markStartNotified(assignment: Assignment) {
    assignment.notifiedStart = true;
    await this.assignmentsRepository.save({
      id: assignment.id,
      notifiedStart: true,
    } as Assignment);
  }

  private async sendStartEmail(assignment: Assignment) {
    const hive = assignment.hive;
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

    const taskTitle = assignment.task?.title ?? 'Užduotis';
    const dueDate = assignment.dueDate ?? 'Nenurodyta';
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
          const details = error instanceof Error ? error.message : String(error);
          this.logger.warn(`Nepavyko išsiųsti aktyvacijos laiško ${email}: ${details}`);
        }
      }),
    );
  }
  private async markDueSoonNotified(assignment: Assignment) {
    assignment.notifiedDueSoon = true;
    await this.assignmentsRepository.save({
      id: assignment.id,
      notifiedDueSoon: true,
    } as Assignment);
  }

  private async sendDueSoonEmail(assignment: Assignment) {
    const hive = assignment.hive;
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

    const taskTitle = assignment.task?.title ?? 'Užduotis';
    const dueDate = assignment.dueDate ?? 'Nenurodyta';
    const link = this.buildAssignmentEmailLink(assignment.id);
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
            subject: 'Primename apie užduotį',
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
