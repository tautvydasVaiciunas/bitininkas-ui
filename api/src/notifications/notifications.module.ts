import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Notification } from './notification.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { ConsoleMailer, MAILER_PORT, SmtpMailer } from './mailer.service';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, User])],
  providers: [
    NotificationsService,
    ConsoleMailer,
    SmtpMailer,
    {
      provide: MAILER_PORT,
      inject: [ConfigService, ConsoleMailer, SmtpMailer],
      useFactory: (
        config: ConfigService,
        consoleMailer: ConsoleMailer,
        smtpMailer: SmtpMailer,
      ) => {
        const driver = (config.get<string>('MAILER_DRIVER') ?? 'console').trim();

        switch (driver) {
          case 'smtp':
            return smtpMailer;
          case 'console':
          default:
            return consoleMailer;
        }
      },
    },
  ],
  controllers: [NotificationsController],
  exports: [NotificationsService, MAILER_PORT],
})
export class NotificationsModule {}
