import { Body, Controller, Get, NotFoundException, Post, Request, Query  } from '@nestjs/common';
import { Throttle, seconds } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RequestResetDto } from './dto/request-reset.dto';
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
  @Throttle({ default: { limit: RATE_LIMIT_MAX, ttl: seconds(RATE_LIMIT_TTL_SECONDS) } })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @Throttle({ default: { limit: RATE_LIMIT_MAX, ttl: seconds(RATE_LIMIT_TTL_SECONDS) } })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('refresh')
  @Throttle({ default: { limit: RATE_LIMIT_MAX, ttl: seconds(RATE_LIMIT_TTL_SECONDS) } })
  refresh(@Body() refreshDto: RefreshDto) {
    return this.authService.refresh(refreshDto.refreshToken);
  }

  @Public()
  @Post('request-reset')
  @Throttle({ default: { limit: RATE_LIMIT_MAX, ttl: seconds(RATE_LIMIT_TTL_SECONDS) } })
  requestReset(@Body() requestResetDto: RequestResetDto) {
    return this.authService.requestPasswordReset(requestResetDto.email);
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
    };
  }
}
