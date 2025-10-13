import { ArgumentsHost, BadRequestException, Catch, ExceptionFilter } from '@nestjs/common';
import { Response } from 'express';

@Catch(BadRequestException)
export class TaskCreateBadRequestFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const existingResponse = exception.getResponse();
    const errorType =
      typeof existingResponse === 'object' && existingResponse !== null && 'error' in existingResponse
        ? (existingResponse as Record<string, unknown>).error ?? 'Bad Request'
        : 'Bad Request';
    const message = (() => {
      const responseMessage =
        typeof existingResponse === 'object' && existingResponse !== null && 'message' in existingResponse
          ? (existingResponse as Record<string, unknown>).message
          : undefined;

      const normalizedResponseMessage = Array.isArray(responseMessage)
        ? responseMessage.find((value) => typeof value === 'string' && value.trim().length > 0)
        : responseMessage;

      if (
        typeof normalizedResponseMessage === 'string' &&
        normalizedResponseMessage.trim().length > 0
      ) {
        return normalizedResponseMessage;
      }

      if (typeof exception.message === 'string' && exception.message.trim().length > 0) {
        return exception.message;
      }

      return 'Nepavyko sukurti užduoties: neteisingi duomenys';
    })();

    response.status(status).json({
      statusCode: status,
      message,
      error: errorType,
    });
  }
}
