import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { diskStorage } from 'multer';
import { extname } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { Express } from 'express';

import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { MulterExceptionFilter } from '../common/filters/multer-exception.filter';
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  RATE_LIMIT_MAX,
  RATE_LIMIT_TTL_SECONDS,
  getMaxBytesForMime,
  UPLOAD_MAX_VIDEO_BYTES,
} from '../common/config/security.config';

const UPLOADS_DIR = '/app/uploads';
const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
};
const SINGLE_FILE_FLAG = '__hasUploadedFile';

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
  @Throttle(RATE_LIMIT_MAX, RATE_LIMIT_TTL_SECONDS)
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
        fileSize: UPLOAD_MAX_VIDEO_BYTES,
        files: 1,
      },
      fileFilter: (req, file, cb) => {
        const request = req as Express.Request & { [SINGLE_FILE_FLAG]?: boolean };

        if (request[SINGLE_FILE_FLAG]) {
          cb(new BadRequestException('Leidžiama įkelti tik vieną failą'), false);
          return;
        }

        if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.mimetype)) {
          cb(new BadRequestException('Failo tipas nepriimtinas'), false);
          return;
        }

        request[SINGLE_FILE_FLAG] = true;
        cb(null, true);
      },
    }),
  )
  async uploadMedia(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Failas nebuvo pateiktas');
    }

    const maxBytes = getMaxBytesForMime(file.mimetype);
    if (maxBytes > 0 && file.size > maxBytes) {
      await unlink(file.path).catch(() => undefined);
      throw new BadRequestException('Failas per didelis');
    }

    return { url: `/uploads/${file.filename}` };
  }
}
