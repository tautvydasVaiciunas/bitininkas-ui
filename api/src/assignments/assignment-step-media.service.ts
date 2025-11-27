import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
}
