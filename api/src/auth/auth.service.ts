import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import { User, UserRole } from '../users/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UsersService } from '../users/users.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { PasswordResetService } from './password-reset.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly activityLog: ActivityLogService,
    private readonly passwordResetService: PasswordResetService,
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

    try {
      await this.passwordResetService.createTokenForUser(user, {
        template: 'forgot',
        enforceCooldown: true,
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.warn(
        `Nepavyko sukurti slaptažodžio atstatymo nuorodos: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    return genericResponse;
  }

  async resetPassword(token: string, newPassword: string) {
    await this.passwordResetService.resetPassword(token, newPassword);
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
