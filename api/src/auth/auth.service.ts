import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
  Logger,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { randomBytes, createHash } from 'crypto';
import * as bcrypt from 'bcryptjs';

import { User, UserRole } from '../users/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UsersService } from '../users/users.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { PasswordResetToken } from './password-reset-token.entity';
import { MAILER_SERVICE, MailerService } from '../notifications/mailer.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
  private readonly RESET_COOLDOWN_MS = 10 * 60 * 1000;

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(PasswordResetToken)
    private readonly resetTokensRepository: Repository<PasswordResetToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly activityLog: ActivityLogService,
    @Inject(MAILER_SERVICE) private readonly mailer: MailerService,
  ) {}

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  async register(dto: RegisterDto) {
    const email = this.normalizeEmail(dto.email);

    const existing = await this.usersRepository.findOne({
      where: { email },
      withDeleted: true,
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepository.create({
      email,
      passwordHash,
      role: UserRole.USER,
      name: dto.name,
    });

    const saved = await this.usersRepository.save(user);
    await this.activityLog.log('user_registered', saved.id, 'user', saved.id);

    return this.buildAuthResponse(saved);
  }

  async validateUser(email: string, password: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const match = await bcrypt.compare(password, user.passwordHash);

    if (!match) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);
    await this.activityLog.log('user_login', user.id, 'user', user.id);

    return this.buildAuthResponse(user);
  }

  async forgotPassword(email: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const genericResponse = {
      message: 'Jei el. paštas registruotas, atstatymo nuoroda išsiųsta.',
    };

    if (!normalizedEmail) {
      return genericResponse;
    }

    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user) {
      return genericResponse;
    }

    const latestToken = await this.resetTokensRepository.findOne({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
    });

    if (
      latestToken &&
      !latestToken.usedAt &&
      latestToken.createdAt &&
      Date.now() - latestToken.createdAt.getTime() < this.RESET_COOLDOWN_MS
    ) {
      throw new BadRequestException(
        'Slaptažodžio atstatymo nuoroda jau išsiųsta. Patikrink el. pašto dėžutę.',
      );
    }

    await this.resetTokensRepository.delete({ userId: user.id });

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + this.RESET_TOKEN_TTL_MS);

    const resetToken = this.resetTokensRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    await this.resetTokensRepository.save(resetToken);
    await this.activityLog.log(
      'password_reset_requested',
      user.id,
      'password_reset_token',
      resetToken.id,
    );

    const baseUrl =
      (this.configService.get<string>('APP_BASE_URL') ?? 'https://app.busmedaus.lt').replace(
        /\/$/,
        '',
      );
    const resetLink = `${baseUrl}/auth/reset?token=${rawToken}`;
    const subject = 'Slaptažodžio atstatymas';
    const textBody = [
      'Sveiki,',
      '',
      'Norėdami atkurti slaptažodį, atverkite nuorodą žemiau (ji galioja 1 valandą):',
      resetLink,
      '',
      'Jei slaptažodžio neatkūrinėjote, ignoruokite šį laišką.',
      '',
      'Bus medaus komanda',
    ].join('\n');
    const htmlBody = textBody
      .split('\n')
      .map((line) => (line === resetLink ? `<p><a href="${resetLink}">${resetLink}</a></p>` : `<p>${line || '&nbsp;'}</p>`))
      .join('');

    try {
      await this.mailer.sendNotificationEmail(user.email, subject, htmlBody, textBody);
    } catch (error) {
      this.logger.warn(
        `Nepavyko išsiųsti slaptažodžio atstatymo el. laiško: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    return genericResponse;
  }

  async resetPassword(token: string, newPassword: string) {
    if (!token) {
      throw new BadRequestException('Trūksta atstatymo kodo.');
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const existing = await this.resetTokensRepository.findOne({
      where: { tokenHash },
      relations: { user: true },
    });

    if (!existing || existing.usedAt) {
      throw new BadRequestException('Atstatymo nuoroda neteisinga arba jau panaudota.');
    }

    if (existing.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Atstatymo nuoroda nebegalioja.');
    }

    const user = existing.user ?? (await this.usersService.findById(existing.userId));

    if (!user) {
      throw new BadRequestException('Atstatymo nuoroda neteisinga.');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersRepository.save(user);

    existing.usedAt = new Date();
    await this.resetTokensRepository.save(existing);
    await this.activityLog.log('password_reset', user.id, 'user', user.id);

    return { message: 'Slaptažodis sėkmingai atnaujintas.' };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.usersService.findById(payload.sub);

      if (!user) {
        throw new UnauthorizedException('Invalid token');
      }

      return this.buildAuthResponse(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private async buildAuthResponse(user: User) {
    const payload = { sub: user.id, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
    };
  }
}
