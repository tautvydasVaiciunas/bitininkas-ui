import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as express from 'express';
import {
  ensureUploadsDir,
  resolveUploadsDir,
  uploadsPrefix,
} from './common/config/storage.config';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RequestLoggingMiddleware } from './common/middleware/request-logging.middleware';


async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  const allowedOrigins = (configService.get<string>('ALLOWED_ORIGINS') || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );
  app.enableCors({
    origin: allowedOrigins.length ? allowedOrigins : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (validationErrors: ValidationError[] = []) => {
        const collectMessages = (errors: ValidationError[]): string[] => {
          const result: string[] = [];

          for (const error of errors) {
            if (error.constraints) {
              result.push(...Object.values(error.constraints));
            }

            if (error.children?.length) {
              result.push(...collectMessages(error.children));
            }
          }

          return result;
        };

        const messages = Array.from(
          new Set(
            collectMessages(validationErrors).filter(
              (message): message is string => Boolean(message),
            ),
          ),
        );

        return new BadRequestException({
          message: 'Pateikti duomenys neteisingi',
          details: messages.length ? messages : undefined,
        });
      },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const requestLogger = new RequestLoggingMiddleware();
  app.use(requestLogger.use.bind(requestLogger));

  ensureUploadsDir();
  const uploadsDir = resolveUploadsDir();
  app.use(
    uploadsPrefix(),
    (req, res, next) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      next();
    },
    express.static(uploadsDir, { index: false, fallthrough: true }),
  );

  const port = Number(configService.get('PORT') || 3000);
  await app.listen(port);
}
bootstrap();
