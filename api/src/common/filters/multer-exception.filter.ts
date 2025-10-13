import { ArgumentsHost, BadRequestException, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { MulterError } from 'multer';

@Catch(MulterError, BadRequestException)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError | BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof MulterError) {
      let message = 'Nepavyko įkelti failo';
      if (exception.code === 'LIMIT_FILE_SIZE') {
        message = 'Failas per didelis';
      }

      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message,
      });
      return;
    }

    const status = exception.getStatus();
    const responseBody = exception.getResponse();
    let message = exception.message;

    if (typeof responseBody === 'string') {
      message = responseBody;
    } else if (
      responseBody &&
      typeof responseBody === 'object' &&
      'message' in responseBody &&
      typeof (responseBody as { message?: unknown }).message === 'string'
    ) {
      message = (responseBody as { message: string }).message;
    }

    if (message === 'File too large') {
      message = 'Failas per didelis';
    }

    response.status(status).json({
      statusCode: status,
      message,
    });
  }
}
