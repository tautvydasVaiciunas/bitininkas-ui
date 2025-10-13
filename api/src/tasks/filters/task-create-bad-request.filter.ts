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

    response.status(status).json({
      statusCode: status,
      message: 'Nepavyko sukurti užduoties: neteisingi duomenys',
      error: errorType,
    });
  }
}
