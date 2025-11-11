import {
  BadRequestException,
  Body,
  Controller,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';

import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import {
  ensureUploadsSubdir,
  resolveUploadsDir,
  uploadsPrefix,
} from '../common/config/storage.config';

const AVATAR_SUBDIR = 'avatars';
const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const isAllowedMimeType = (mimetype: string) => ALLOWED_MIME_TYPES.includes(mimetype);

const deleteFileIfExists = async (filePath?: string) => {
  if (!filePath) {
    return;
  }

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      // eslint-disable-next-line no-console
      console.warn(`Nepavyko pašalinti failo ${filePath}: ${(error as Error).message}`);
    }
  }
};

@Controller('profile')
export class ProfileController {
  constructor(private readonly usersService: UsersService) {}

  @Patch()
  update(@Body() dto: UpdateProfileDto, @Request() req) {
    return this.usersService.updateProfile(req.user.id, dto).then((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone ?? null,
      address: user.address ?? null,
      avatarUrl: user.avatarUrl ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
  }

  @Patch('password')
  updatePassword(@Body() dto: UpdatePasswordDto, @Request() req) {
    return this.usersService.updatePassword(req.user.id, dto);
  }

  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          try {
            const dir = ensureUploadsSubdir(AVATAR_SUBDIR);
            cb(null, dir);
          } catch (error) {
            cb(error as Error, resolveUploadsDir());
          }
        },
        filename: (_req, file, cb) => {
          const extension = extname(file.originalname) || '.png';
          cb(null, `${randomUUID()}${extension}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!isAllowedMimeType(file.mimetype)) {
          cb(
            new BadRequestException('Leidžiami tik PNG, JPEG arba WEBP formato paveikslėliai.'),
            false,
          );
          return;
        }

        cb(null, true);
      },
    }),
  )
  async uploadAvatar(@Request() req, @UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException('Failas nebuvo pateiktas');
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      await deleteFileIfExists(file.path);
      throw new BadRequestException('Leidžiamas maksimalus avataro dydis – 5 MB.');
    }

    if (!isAllowedMimeType(file.mimetype)) {
      await deleteFileIfExists(file.path);
      throw new BadRequestException('Leidžiami tik PNG, JPEG arba WEBP formato paveikslėliai.');
    }

    const avatarUrl = `${uploadsPrefix()}/${AVATAR_SUBDIR}/${file.filename}`;
    await this.usersService.setAvatar(req.user.id, avatarUrl);
    return { avatarUrl };
  }
}

