import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Request,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from '../common/decorators/public.decorator';
import { UsersService } from '../users/users.service';
import { RATE_LIMIT_MAX, RATE_LIMIT_TTL_SECONDS } from '../common/config/security.config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @Post('register')
  @Throttle({ default: { limit: RATE_LIMIT_MAX, ttl: RATE_LIMIT_TTL_SECONDS * 1000 } })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @Throttle({ default: { limit: RATE_LIMIT_MAX, ttl: RATE_LIMIT_TTL_SECONDS * 1000 } })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('refresh')
  @Throttle({ default: { limit: RATE_LIMIT_MAX, ttl: RATE_LIMIT_TTL_SECONDS * 1000 } })
  refresh(@Body() refreshDto: RefreshDto) {
    return this.authService.refresh(refreshDto.refreshToken);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: RATE_LIMIT_MAX, ttl: RATE_LIMIT_TTL_SECONDS * 1000 } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @Throttle({ default: { limit: RATE_LIMIT_MAX, ttl: RATE_LIMIT_TTL_SECONDS * 1000 } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Get('me')
  async me(@Request() req) {
    const user = await this.usersService.findById(req.user.id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      subscriptionValidUntil: user.subscriptionValidUntil ?? null,
    };
  }
}
