import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from './activity-log.entity';

@Injectable()
export class ActivityLogService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly repository: Repository<ActivityLog>,
  ) {}

  async log(action: string, userId?: string, entity?: string, entityId?: string) {
    const log = this.repository.create({ action, userId, entity, entityId });
    await this.repository.save(log);
    return log;
  }
}
