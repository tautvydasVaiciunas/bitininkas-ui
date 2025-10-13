import { ArgumentsHost, BadRequestException, Catch, ExceptionFilter } from '@nestjs/common';
import { Response } from 'express';

import { buildErrorResponseBody } from '../../common/filters/http-exception.filter';

@Catch(BadRequestException)
export class TaskCreateBadRequestFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    response.status(status).json(buildErrorResponseBody(exception));
  }
}
