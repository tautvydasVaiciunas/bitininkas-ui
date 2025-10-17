import { Body, Controller, Inject, Post } from '@nestjs/common';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import {
  DEFAULT_CTA_LABEL,
  renderNotificationEmailHtml,
  renderNotificationEmailText,
} from './email-template';
import { MAILER_SERVICE, MailerService } from './mailer.service';

class TestEmailDto {
  @IsEmail({}, { message: 'Neteisingas el. pašto adresas' })
  to!: string;

  @IsString({ message: 'Tema privaloma' })
  @MinLength(1, { message: 'Tema privaloma' })
  subject!: string;

  @IsOptional()
  @IsString({ message: 'Tekstas turi būti tekstas' })
  text?: string;

  @IsOptional()
  @IsString({ message: 'HTML turinys turi būti tekstas' })
  html?: string;
}

@Controller('debug')
export class DebugEmailController {
  constructor(@Inject(MAILER_SERVICE) private readonly mailer: MailerService) {}

  @Post('test-email')
  @Roles(UserRole.ADMIN)
  async sendTestEmail(@Body() body: TestEmailDto) {
    const fallbackMessage = body.text ?? 'Testinis pranešimas';
    const html =
      body.html ??
      renderNotificationEmailHtml({
        subject: body.subject,
        message: fallbackMessage,
        ctaUrl: null,
        ctaLabel: DEFAULT_CTA_LABEL,
      });
    const text = body.text ?? renderNotificationEmailText({ message: fallbackMessage });

    await this.mailer.sendNotificationEmail(body.to, body.subject, html, text);

    return { success: true };
  }
}
