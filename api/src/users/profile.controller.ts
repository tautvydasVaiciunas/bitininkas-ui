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

import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { ensureUploadsDir, resolveUploadsDir, uploadsPrefix } from '../common/config/storage.config';

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
          const dir = `${resolveUploadsDir()}/avatars`;
          try {
            ensureUploadsDir();
            cb(null, dir);
          } catch (error) {
            cb(error as Error, dir);
          }
        },
        filename: (_req, file, cb) => {
          const extension = extname(file.originalname) || '.png';
          cb(null, `${randomUUID()}${extension}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new BadRequestException('Leidžiami tik paveikslėlių failai'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadAvatar(@UploadedFile() file?: Express.Multer.File, @Request() req) {
    if (!file) {
      throw new BadRequestException('Failas nebuvo pateiktas');
    }

    const avatarUrl = `${uploadsPrefix()}/avatars/${file.filename}`;
    await this.usersService.setAvatar(req.user.id, avatarUrl);
    return { avatarUrl };
  }
}
