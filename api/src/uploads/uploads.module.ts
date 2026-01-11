import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StoredUpload } from './stored-upload.entity';
import { UploadsService } from './uploads.service';

@Module({
  imports: [TypeOrmModule.forFeature([StoredUpload])],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
