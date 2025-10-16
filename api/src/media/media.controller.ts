import { BadRequestException, Controller, Post, UploadedFile, UseFilters, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { Express } from 'express';

import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { MulterExceptionFilter } from '../common/filters/multer-exception.filter';

const UPLOADS_DIR = '/app/uploads';
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'video/mp4']);
const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'video/mp4': '.mp4',
};

const ensureUploadsDirExists = () => {
  if (!existsSync(UPLOADS_DIR)) {
    mkdirSync(UPLOADS_DIR, { recursive: true });
  }
};

const resolveFileName = (file: Express.Multer.File) => {
  const extension = MIME_EXTENSION_MAP[file.mimetype] ?? extname(file.originalname) ?? '';
  return `${randomUUID()}${extension}`;
};

@UseFilters(MulterExceptionFilter)
@Controller('media')
export class MediaController {
  @Post('upload')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          try {
            ensureUploadsDirExists();
            cb(null, UPLOADS_DIR);
          } catch (error) {
            cb(error as Error, UPLOADS_DIR);
          }
        },
        filename: (_req, file, cb) => {
          try {
            const filename = resolveFileName(file);
            cb(null, filename);
          } catch (error) {
            cb(error as Error, file.originalname);
          }
        },
      }),
      limits: {
        fileSize: MAX_FILE_SIZE,
      },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
          cb(new BadRequestException('Failo formatas nepalaikomas'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadMedia(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Failo formatas nepalaikomas');
    }

    return { url: `/uploads/${file.filename}` };
  }
}
