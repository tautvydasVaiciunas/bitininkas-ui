import { Body, Controller, Post } from '@nestjs/common';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { EmailService } from './email.service';

class SendTestEmailDto {
  @IsEmail()
  @IsNotEmpty()
  to!: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  body?: string;
}

@Controller('admin/email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('test')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  async sendTestEmail(@Body() body: SendTestEmailDto) {
    const subject =
      body.subject?.trim() || 'Bus medaus – testinis laiškas';
    const text =
      body.body?.trim() || 'Tai testinis laiškas iš Bus medaus platformos.';
    const html = `<p>${text}</p>`;

    await this.emailService.sendMail({
      to: body.to,
      subject,
      text,
      html,
    });

    return { success: true };
  }
}
