import {
  BadRequestException,
  Controller,
  Delete,
  ForbiddenException,
  NotFoundException,
  Param,
  Post,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { Express } from 'express';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { MulterExceptionFilter } from '../common/filters/multer-exception.filter';
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  getMaxBytesForMime,
  UPLOAD_MAX_VIDEO_BYTES,
} from '../common/config/security.config';
import {
  ensureUploadsDir,
  resolveUploadsDir,
  uploadsPrefix,
} from '../common/config/storage.config';
import { UserRole } from '../users/user.entity';

import { AssignmentsService } from './assignments.service';
import { AssignmentStepMediaService } from './assignment-step-media.service';

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
};

const resolveFileName = (file: Express.Multer.File) => {
  const extension = MIME_EXTENSION_MAP[file.mimetype] ?? extname(file.originalname) ?? '';
  return `${randomUUID()}${extension}`;
};

@UseGuards(JwtAuthGuard)
@UseFilters(MulterExceptionFilter)
@Controller('assignments')
export class AssignmentStepMediaController {
  constructor(
    private readonly assignmentsService: AssignmentsService,
    private readonly stepMedia: AssignmentStepMediaService,
  ) {}

  @Post(':assignmentId/steps/:stepId/media')
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
        filename: (_req, file, cb) => cb(null, resolveFileName(file)),
      }),
      limits: {
        fileSize: UPLOAD_MAX_VIDEO_BYTES,
        files: 1,
      },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.mimetype)) {
          cb(new BadRequestException('Nepalaikomas failo tipas'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async upload(
    @Param('assignmentId') assignmentId: string,
    @Param('stepId') stepId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Express.Request & { user: { id: string; role: string } },
  ) {
    if (!file) {
      throw new BadRequestException('Failas nebuvo pateiktas');
    }

    const assignment = await this.assignmentsService.ensureUserCanAccessAssignment(
      assignmentId,
      req.user,
    );

    const today = new Date().toISOString().slice(0, 10);
    if (assignment.startDate && assignment.startDate > today) {
      throw new ForbiddenException('Užduotis dar neprasidėjo.');
    }

    const mimeType = file.mimetype ?? 'application/octet-stream';
    const kind = mimeType.startsWith('image/') ? 'image' : mimeType.startsWith('video/') ? 'video' : 'other';
    const url = `${uploadsPrefix()}/${file.filename}`;
    const entity = await this.stepMedia.create({
      assignmentId: assignment.id,
      stepId,
      userId: req.user.id,
      url,
      mimeType,
      kind,
      sizeBytes: file.size,
    });

    return {
      id: entity.id,
      url: entity.url,
      mimeType: entity.mimeType,
      kind: entity.kind,
      sizeBytes: entity.sizeBytes,
      createdAt: entity.createdAt,
    };
  }

  @Delete(':assignmentId/steps/:stepId/media/:mediaId')
  async remove(
    @Param('assignmentId') assignmentId: string,
    @Param('stepId') stepId: string,
    @Param('mediaId') mediaId: string,
    @Req() req: Express.Request & { user: { id: string; role: string } },
  ) {
    const assignment = await this.assignmentsService.ensureUserCanAccessAssignment(
      assignmentId,
      req.user,
    );

    const media = await this.stepMedia.findById(mediaId);
    if (!media || media.assignmentId !== assignment.id || media.stepId !== stepId) {
      throw new NotFoundException('Failas nerastas');
    }

    if (media.userId !== req.user.id && req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.MANAGER) {
      throw new ForbiddenException('Jums neleidžiama modifikuoti šio failo');
    }

    await this.stepMedia.remove(media);

    return { success: true };
  }

}
