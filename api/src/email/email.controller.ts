import { Controller, Post, Body } from '@nestjs/common';
import { IsEmail, IsNotEmpty } from 'class-validator';

import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { EmailService } from './email.service';

class SendTestEmailDto {
  @IsEmail()
  @IsNotEmpty()
  to!: string;
}

@Controller('admin/email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('test')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  async sendTestEmail(@Body() body: SendTestEmailDto) {
    await this.emailService.sendMail({
      to: body.to,
      subject: 'Bus medaus – testinis laiškas',
      text: 'Tai testinis laiškas iš Bus medaus platformos.',
      html: '<p>Tai testinis laiškas iš <strong>Bus medaus</strong> platformos.</p>',
    });

    return { success: true };
  }
}
