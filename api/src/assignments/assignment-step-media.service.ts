import { unlink } from 'node:fs/promises';
import * as path from 'node:path';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  resolveUploadsDir,
  uploadsPrefix,
} from '../common/config/storage.config';
import { AssignmentStepMedia } from './assignment-step-media.entity';

@Injectable()
export class AssignmentStepMediaService {
  constructor(
    @InjectRepository(AssignmentStepMedia)
    private readonly repository: Repository<AssignmentStepMedia>,
  ) {}

  async create(params: {
    assignmentId: string;
    stepId: string;
    userId: string;
    url: string;
    mimeType: string;
    kind: string;
    sizeBytes: number;
  }): Promise<AssignmentStepMedia> {
    const entity = this.repository.create(params);
    return this.repository.save(entity);
  }

  async findByAssignment(assignmentId: string): Promise<AssignmentStepMedia[]> {
    return this.repository.find({
      where: { assignmentId },
      order: { createdAt: 'ASC' },
    });
  }

  async findById(id: string): Promise<AssignmentStepMedia | null> {
    return this.repository.findOne({ where: { id } });
  }

  async remove(media: AssignmentStepMedia): Promise<void> {
    await this.repository.remove(media);

    const uploadsDir = resolveUploadsDir();
    const prefix = uploadsPrefix();
    let relativePath = media.url.startsWith(prefix)
      ? media.url.slice(prefix.length)
      : media.url;
    relativePath = relativePath.replace(/^\/+/,'');

    if (!relativePath) {
      return;
    }

    const absolutePath = path.join(uploadsDir, relativePath);
    try {
      await unlink(absolutePath);
    } catch {
      // ignore missing files
    }
  }
}
