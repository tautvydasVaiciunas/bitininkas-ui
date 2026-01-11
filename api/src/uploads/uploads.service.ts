import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { readFile } from 'node:fs/promises';
import { Repository } from 'typeorm';

import { StoredUpload } from './stored-upload.entity';

@Injectable()
export class UploadsService {
  constructor(
    @InjectRepository(StoredUpload)
    private readonly repository: Repository<StoredUpload>,
  ) {}

  async storeFromDisk(params: {
    relativePath: string;
    absolutePath: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<StoredUpload> {
    const { relativePath, absolutePath, mimeType, sizeBytes } = params;
    const buffer = await readFile(absolutePath);

    const existing = await this.repository.findOne({
      where: { relativePath },
    });

    if (existing) {
      existing.mimeType = mimeType;
      existing.sizeBytes = sizeBytes;
      existing.data = buffer;
      return this.repository.save(existing);
    }

    const entity = this.repository.create({
      relativePath,
      mimeType,
      sizeBytes,
      data: buffer,
    });

    return this.repository.save(entity);
  }

  async findByRelativePath(relativePath: string): Promise<StoredUpload | null> {
    return this.repository.findOne({
      where: { relativePath },
    });
  }

  async deleteByRelativePath(relativePath: string): Promise<void> {
    await this.repository.delete({ relativePath });
  }
}
