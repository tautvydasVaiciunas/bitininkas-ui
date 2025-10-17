import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');
  private clientErrorCount = 0;
  private serverErrorCount = 0;

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const method = req.method;
      const url = req.originalUrl ?? req.url ?? 'unknown';
      const status = res.statusCode;
      const message = `${method} ${url} -> ${status} (${duration}ms)`;

      if (status >= 500) {
        this.serverErrorCount += 1;
        this.logger.error(`${message} | 5xx_count=${this.serverErrorCount}`);
      } else if (status >= 400) {
        this.clientErrorCount += 1;
        this.logger.warn(`${message} | 4xx_count=${this.clientErrorCount}`);
      } else {
        this.logger.log(message);
      }
    });

    next();
  }
}
