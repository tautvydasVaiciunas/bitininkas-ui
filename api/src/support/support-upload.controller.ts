import {
  BadRequestException,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'node:path';
import { unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { Express, Request } from 'express';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { MulterExceptionFilter } from '../common/filters/multer-exception.filter';
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  getMaxBytesForMime,
  RATE_LIMIT_MAX,
  RATE_LIMIT_TTL_SECONDS,
  UPLOAD_MAX_VIDEO_BYTES,
} from '../common/config/security.config';
import {
  ensureUploadsDir,
  resolveUploadsDir,
  stripUploadsPrefix,
  uploadsPrefix,
} from '../common/config/storage.config';
import { resolveRequestBaseUrl } from '../common/utils/request-base-url';
import { UploadsService } from '../uploads/uploads.service';

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
};

const SINGLE_FILE_FLAG = '__supportUploadFile';

const resolveFileName = (file: Express.Multer.File) => {
  const extension = MIME_EXTENSION_MAP[file.mimetype] ?? extname(file.originalname) ?? '';
  return `${randomUUID()}${extension}`;
};

@UseGuards(JwtAuthGuard)
@UseFilters(MulterExceptionFilter)
@Controller('support')
export class SupportUploadController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          try {
            ensureUploadsDir();
            cb(null, resolveUploadsDir());
          } catch (error) {
            cb(error as Error, resolveUploadsDir());
          }
        },
        filename: (_req, file, cb) => {
          cb(null, resolveFileName(file));
        },
      }),
      limits: {
        fileSize: UPLOAD_MAX_VIDEO_BYTES,
        files: 1,
      },
      fileFilter: (req, file, cb) => {
        const request = req as Express.Request & { [SINGLE_FILE_FLAG]?: boolean };
        if (request[SINGLE_FILE_FLAG]) {
          cb(new BadRequestException('Leidžiama kelti tik vieną failą.'), false);
          return;
        }

        if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.mimetype)) {
          cb(new BadRequestException('Nepalaikomas failo tipas'), false);
          return;
        }

        request[SINGLE_FILE_FLAG] = true;
        cb(null, true);
      },
    }),
  )
  async upload(@UploadedFile() file?: Express.Multer.File, @Req() req?: Request) {
    if (!file) {
      throw new BadRequestException('Failas nebuvo pateiktas');
    }

    const maxBytes = getMaxBytesForMime(file.mimetype);
    if (maxBytes > 0 && file.size > maxBytes) {
      await unlink(file.path).catch(() => undefined);
      throw new BadRequestException('Failas per didelis');
    }

    const mimeType = file.mimetype ?? 'application/octet-stream';
    const kind =
      mimeType.startsWith('image/') ? 'image' : mimeType.startsWith('video/') ? 'video' : 'other';

    const relativePath =
      stripUploadsPrefix(`${uploadsPrefix()}/${file.filename}`) ?? file.filename;
    await this.uploadsService.storeFromDisk({
      relativePath,
      absolutePath: file.path,
      mimeType,
      sizeBytes: file.size,
    });

    const canonicalPath = `${uploadsPrefix()}/${file.filename}`;
    const baseUrl = req ? resolveRequestBaseUrl(req) : null;
    const url = baseUrl ? `${baseUrl}${canonicalPath}` : canonicalPath;

    return {
      url,
      mimeType,
      sizeBytes: file.size,
      kind,
    };
  }
}
