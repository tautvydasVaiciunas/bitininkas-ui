import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'crypto';
import * as bcrypt from 'bcryptjs';

import { PasswordResetToken } from './password-reset-token.entity';
import { User } from '../users/user.entity';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { EmailService } from '../email/email.service';

interface CreateTokenOptions {
  template: 'forgot' | 'invite';
  enforceCooldown?: boolean;
}

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  private readonly RESET_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
  private readonly RESET_COOLDOWN_MS = 10 * 60 * 1000;

  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly tokensRepository: Repository<PasswordResetToken>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly activityLog: ActivityLogService,
    private readonly emailService: EmailService,
  ) {}

  async createTokenForUser(user: User, options: CreateTokenOptions) {
    if (options.enforceCooldown) {
      const latest = await this.tokensRepository.findOne({
        where: { userId: user.id },
        order: { createdAt: 'DESC' },
      });

      if (
        latest &&
        !latest.usedAt &&
        latest.createdAt &&
        Date.now() - latest.createdAt.getTime() < this.RESET_COOLDOWN_MS
      ) {
        throw new BadRequestException(
          'Slaptažodžio atstatymo nuoroda jau išsiųsta. Patikrink el. pašto dėžutę.',
        );
      }
    }

    await this.tokensRepository.delete({ userId: user.id });

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + this.RESET_TOKEN_TTL_MS);

    const entity = this.tokensRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    await this.tokensRepository.save(entity);
    await this.activityLog.log(
      options.template === 'invite' ? 'user_invited' : 'password_reset_requested',
      user.id,
      'password_reset_token',
      entity.id,
    );

    const baseUrl = (
      this.configService.get<string>('APP_BASE_URL') ?? 'https://app.busmedaus.lt'
    ).replace(/\/$/, '');
    const resetLink = `${baseUrl}/auth/reset?token=${rawToken}`;

    const { subject, textBody } =
      options.template === 'invite'
        ? this.buildInviteMessage(resetLink)
        : this.buildForgotMessage(resetLink);

    const htmlBody = textBody
      .split('\n')
      .map((line) =>
        line === resetLink ? `<p><a href="${resetLink}">${resetLink}</a></p>` : `<p>${line || '&nbsp;'}</p>`,
      )
      .join('');

    try {
      await this.emailService.sendMail({
        to: user.email,
        subject,
        text: textBody,
        html: htmlBody,
      });
    } catch (error) {
      this.logger.warn(
        `Nepavyko išsiųsti slaptažodžio atstatymo laiško: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    const includeToken =
      (this.configService.get<string>('NODE_ENV') ?? 'development').trim() !== 'production';

    return includeToken ? rawToken : undefined;
  }

  async resetPassword(token: string, newPassword: string) {
    if (!token) {
      throw new BadRequestException('Trūksta atstatymo kodo.');
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const existing = await this.tokensRepository.findOne({
      where: { tokenHash },
      relations: { user: true },
    });

    if (!existing || existing.usedAt) {
      throw new BadRequestException('Atstatymo nuoroda neteisinga arba jau panaudota.');
    }

    if (existing.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Atstatymo nuoroda nebegalioja.');
    }

    const user =
      existing.user ?? (await this.usersRepository.findOne({ where: { id: existing.userId } }));

    if (!user) {
      throw new BadRequestException('Atstatymo nuoroda neteisinga.');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersRepository.save(user);

    existing.usedAt = new Date();
    await this.tokensRepository.save(existing);
    await this.activityLog.log('password_reset', user.id, 'user', user.id);
  }

  private buildForgotMessage(link: string) {
    return {
      subject: 'Slaptažodžio atstatymas',
      textBody: [
        'Sveiki,',
        '',
        'Norėdami atkurti slaptažodį, atverkite šią nuorodą (galioja 1 valandą):',
        link,
        '',
        'Jei slaptažodžio neatkūrinėjote, ignoruokite šį laišką.',
        '',
        'Bus medaus komanda',
      ].join('\n'),
    };
  }

  private buildInviteMessage(link: string) {
    return {
      subject: 'Jums sukurta paskyra',
      textBody: [
        'Sveiki,',
        '',
        'Jums sukurta Bus medaus paskyra. Prisijunkite susikūrę slaptažodį:',
        link,
        '',
        'Nuoroda galioja 1 valandą. Jei paskyra nebereikalinga, ignoruokite šį laišką.',
        '',
        'Bus medaus komanda',
      ].join('\n'),
    };
  }
}
