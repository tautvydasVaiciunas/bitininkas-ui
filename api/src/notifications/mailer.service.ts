import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Notification } from './notification.entity';

export interface MailerMessage {
  userId: string;
  subject: string;
  body: string;
  notificationType?: string;
  payload?: Record<string, unknown>;
}

export interface MailerPort {
  send(message: MailerMessage): Promise<void>;
}

export const MAILER_PORT = Symbol('MAILER_PORT');

@Injectable()
export class ConsoleMailer implements MailerPort {
  private readonly logger = new Logger(ConsoleMailer.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
  ) {}

  async send(message: MailerMessage): Promise<void> {
    const type = message.notificationType ?? 'email_mock';
    this.logger.log(
      `Mock email (${type}) to user ${message.userId}: ${message.subject}`,
    );

    await this.notificationsRepository.save(
      this.notificationsRepository.create({
        userId: message.userId,
        type,
        payload: {
          subject: message.subject,
          body: message.body,
          ...(message.payload ?? {}),
        },
        sentAt: new Date(),
      }),
    );
  }
}
