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

  private normalizeNullableString(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : null;
  }

  async log(action: string, userId?: string, entity?: string, entityId?: string) {
    const log = this.repository.create({
      action,
      userId: userId ?? null,
      entity: this.normalizeNullableString(entity),
      entityId: entityId ?? null,
    });

    await this.repository.save(log);
    return log;
  }
}
