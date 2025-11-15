import { Controller, Get } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

import { Public } from '../common/decorators/public.decorator';
import { resolveUploadsDir } from '../common/config/storage.config';

@Controller('debug')
export class DebugController {
  @Public()
  @Get('uploads-seed')
  checkUploadsSeed() {
    const uploadsDir = resolveUploadsDir();
    const seedDir = path.join(uploadsDir, 'seed');
    let files: string[] = [];

    try {
      if (fs.existsSync(seedDir)) {
        files = fs.readdirSync(seedDir);
      }
    } catch (error) {
      console.warn('Nepavyko nuskaityti /uploads/seed katalogo', error);
    }

    return {
      uploadsDir,
      seedDir,
      files,
    };
  }
}
