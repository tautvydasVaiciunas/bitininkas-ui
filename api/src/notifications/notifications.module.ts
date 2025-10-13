import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Notification } from './notification.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { ConsoleMailer, MAILER_PORT } from './mailer.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  providers: [
    NotificationsService,
    ConsoleMailer,
    {
      provide: MAILER_PORT,
      inject: [ConfigService, ConsoleMailer],
      useFactory: (config: ConfigService, consoleMailer: ConsoleMailer) => {
        const driver = (config.get<string>('MAILER_DRIVER') ?? 'console').trim();

        switch (driver) {
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
