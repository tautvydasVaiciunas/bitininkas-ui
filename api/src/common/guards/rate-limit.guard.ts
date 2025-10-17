import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ThrottlerException, ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  private readonly logger = new Logger(RateLimitGuard.name);

  protected throwThrottlingException(context: ExecutionContext): never {
    const request = context.switchToHttp().getRequest<Request>();

    this.logger.warn(
      `Per daug užklausų: ${request.method} ${request.originalUrl ?? request.url}`,
      RateLimitGuard.name,
    );

    throw new ThrottlerException('Per daug užklausų. Bandykite vėliau.');
  }
}
