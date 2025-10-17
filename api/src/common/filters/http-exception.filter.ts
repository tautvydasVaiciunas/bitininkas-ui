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

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter<HttpException> {
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
    const logMessage = `${method} ${url} -> ${status} ${body.message}`;

    if (status === HttpStatus.TOO_MANY_REQUESTS) {
      this.logger.warn(`${logMessage} (ip: ${ip}, user: ${userId ?? 'n/a'})`);
    } else if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${logMessage} (ip: ${ip}, user: ${userId ?? 'n/a'})`);
    } else {
      this.logger.log(`${logMessage} (ip: ${ip}, user: ${userId ?? 'n/a'})`);
    }

    response.status(status).json(body);
  }
}
