import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

export interface ErrorResponseBody {
  message: string;
  code?: string;
  details?: unknown;
}

const extractMessage = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    return value.find((item) => typeof item === 'string' && item.trim().length > 0) as
      | string
      | undefined;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  return undefined;
};

export const buildErrorResponseBody = (exception: HttpException): ErrorResponseBody => {
  const existing = exception.getResponse();
  let message: string | undefined;
  let code: string | undefined;
  let details: unknown;

  if (typeof existing === 'string') {
    message = existing;
  } else if (typeof existing === 'object' && existing !== null) {
    const payload = existing as Record<string, unknown>;
    message = extractMessage(payload.message);

    if (!message) {
      message = extractMessage(payload['error']);
    }

    if (typeof payload.code === 'string' && payload.code.trim().length > 0) {
      code = payload.code;
    }

    if ('details' in payload) {
      details = payload.details;
    } else if (Array.isArray(payload.message)) {
      details = payload.message;
    }
  }

  if (!message) {
    const exceptionMessage = exception.message;
    if (typeof exceptionMessage === 'string' && exceptionMessage.trim().length > 0) {
      message = exceptionMessage;
    }
  }

  if (!message) {
    message = 'Įvyko klaida';
  }

  const body: ErrorResponseBody = { message };

  if (code) {
    body.code = code;
  }

  if (details !== undefined) {
    body.details = details;
  }

  return body;
};

export class HttpExceptionFilter implements ExceptionFilter<HttpException> {
  private static readonly QUIET_401_ROUTES = new Set<string>(['GET /auth/me']);
  private static readonly RETRY_HEADER = 'x-auth-retry';

  private static normalizeRouteKey(method?: string, url?: string) {
    const normalizedMethod = (method ?? 'UNKNOWN').toUpperCase();
    if (!url) {
      return normalizedMethod;
    }
    const path = url.split('?')[0];
    return `${normalizedMethod} ${path}`;
  }

  private static isRefreshRetry(request: Request | undefined) {
    if (!request) {
      return false;
    }
    const header = request.headers?.[HttpExceptionFilter.RETRY_HEADER];
    if (Array.isArray(header)) {
      return header.some((value) => typeof value === 'string' && value.toLowerCase() === 'refresh');
    }
    return typeof header === 'string' && header.toLowerCase() === 'refresh';
  }

  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const body = buildErrorResponseBody(exception);

    const method = request?.method ?? 'UNKNOWN';
    const url = request?.originalUrl ?? request?.url ?? 'unknown';
    const userId = (request?.user as { id?: string } | undefined)?.id ?? null;
    const ip = request?.ip ?? request?.headers?.['x-forwarded-for'] ?? 'unknown';
    const routeKey = HttpExceptionFilter.normalizeRouteKey(method, url);
    const logMessage = `${method} ${url} -> ${status} ${body.message}`;
    const stack = exception instanceof Error ? exception.stack : undefined;

    const logWithLevel = (level: 'debug' | 'log' | 'warn' | 'error') => {
      const message = `${logMessage} (ip: ${ip}, user: ${userId ?? 'n/a'})`;
      switch (level) {
        case 'debug':
          this.logger.debug(message);
          break;
        case 'warn':
          this.logger.warn(message);
          break;
        case 'error':
          this.logger.error(message, stack);
          break;
        default:
          this.logger.log(message);
      }
    };

    if (status === HttpStatus.UNAUTHORIZED) {
      if (HttpExceptionFilter.isRefreshRetry(request)) {
        logWithLevel('warn');
      } else if (HttpExceptionFilter.QUIET_401_ROUTES.has(routeKey)) {
        logWithLevel('debug');
      } else {
        logWithLevel('log');
      }
    } else if (status === HttpStatus.TOO_MANY_REQUESTS) {
      this.logger.warn(`${logMessage} (ip: ${ip}, user: ${userId ?? 'n/a'})`);
    } else if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${logMessage} (ip: ${ip}, user: ${userId ?? 'n/a'})`, stack);
    } else {
      this.logger.log(`${logMessage} (ip: ${ip}, user: ${userId ?? 'n/a'})`);
    }

    response.status(status).json(body);
  }
}
