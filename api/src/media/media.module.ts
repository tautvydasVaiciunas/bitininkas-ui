import { Module } from '@nestjs/common';

import { MediaController } from './media.controller';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [UploadsModule],
  controllers: [MediaController],
})
export class MediaModule {}
