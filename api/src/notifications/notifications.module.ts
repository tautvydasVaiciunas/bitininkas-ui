import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Notification } from './notification.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import {
  MAILER_SERVICE,
  NoopMailer,
  PostmarkMailer,
  ResendMailer,
  SmtpMailer,
} from './mailer.service';
import { DebugEmailController } from './debug-email.controller';
import { User } from '../users/user.entity';
import { EmailModule } from '../email/email.module';

const debugControllers =
  process.env.NODE_ENV === 'production' ? [] : [DebugEmailController];

@Module({
  imports: [TypeOrmModule.forFeature([Notification, User]), EmailModule],
  providers: [
    NotificationsService,
    PostmarkMailer,
    ResendMailer,
    SmtpMailer,
    NoopMailer,
    {
      provide: MAILER_SERVICE,
      inject: [ConfigService, PostmarkMailer, ResendMailer, SmtpMailer, NoopMailer],
      useFactory: (
        config: ConfigService,
        postmark: PostmarkMailer,
        resend: ResendMailer,
        smtp: SmtpMailer,
        noop: NoopMailer,
      ) => {
        const provider = (config.get<string>('MAIL_PROVIDER') ?? '').trim().toLowerCase();
        const logger = new Logger('MailerFactory');

        const hasFrom = Boolean((config.get<string>('MAIL_FROM') ?? '').trim());

        if (!provider) {
          logger.warn('MAIL_PROVIDER nenurodytas. Naudojamas NoopMailer.');
          return noop;
        }

        if (!hasFrom) {
          logger.warn('MAIL_FROM nenurodytas. Naudojamas NoopMailer.');
          return noop;
        }

        switch (provider) {
          case 'postmark':
            if ((config.get<string>('POSTMARK_SERVER_TOKEN') ?? '').trim()) {
              return postmark;
            }
            logger.warn(
              'Postmark konfigūracija nepilna (POSTMARK_SERVER_TOKEN). Naudojamas NoopMailer.',
            );
            return noop;
          case 'resend':
            if ((config.get<string>('RESEND_API_KEY') ?? '').trim()) {
              return resend;
            }
            logger.warn(
              'Resend konfigūracija nepilna (RESEND_API_KEY). Naudojamas NoopMailer.',
            );
            return noop;
          case 'smtp': {
            const hasHost = Boolean((config.get<string>('SMTP_HOST') ?? '').trim());
            const hasPort = Boolean((config.get<string>('SMTP_PORT') ?? '').trim());

            if (hasHost && hasPort) {
              return smtp;
            }

            logger.warn(
              'SMTP konfigūracija nepilna (SMTP_HOST/SMTP_PORT). Naudojamas NoopMailer.',
            );
            return noop;
          }
          default:
            logger.warn(
              `Nežinomas MAIL_PROVIDER (${provider}). Naudojamas NoopMailer.`,
            );
            return noop;
        }
      },
    },
  ],
  controllers: [NotificationsController, ...debugControllers],
  exports: [NotificationsService, MAILER_SERVICE],
})
export class NotificationsModule {}
