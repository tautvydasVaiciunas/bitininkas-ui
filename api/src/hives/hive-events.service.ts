import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HiveEvent, HiveEventType } from './hive-event.entity';
import { Hive } from './hive.entity';
import { User } from '../users/user.entity';

@Injectable()
export class HiveEventsService {
  constructor(
    @InjectRepository(HiveEvent)
    private readonly hiveEventsRepository: Repository<HiveEvent>,
    @InjectRepository(Hive)
    private readonly hiveRepository: Repository<Hive>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async logEvent(
    hiveId: string,
    type: HiveEventType,
    payload: Record<string, unknown>,
    userId?: string | null,
  ) {
    const event = this.hiveEventsRepository.create({
      hiveId,
      type,
      payload,
      userId: userId ?? null,
    });
    await this.hiveEventsRepository.save(event);
  }

  async logHiveUpdated(
    hiveId: string,
    changedFields: Record<string, { before: unknown; after: unknown }>,
    userId?: string,
  ) {
    if (!Object.keys(changedFields).length) {
      return;
    }
    await this.logEvent(hiveId, HiveEventType.HIVE_UPDATED, { changedFields }, userId);
  }

  async logTaskAssigned(
    hiveId: string,
    assignmentId: string,
    taskId: string,
    taskTitle: string,
    startDate: string | null,
    dueDate: string | null,
    userId?: string,
  ) {
    await this.logEvent(
      hiveId,
      HiveEventType.TASK_ASSIGNED,
      { assignmentId, taskId, taskTitle, startDate, dueDate },
      userId,
    );
  }

  async logTaskDatesChanged(
    hiveId: string,
    assignmentId: string,
    taskId: string,
    taskTitle: string,
    previousStartDate: string | null,
    nextStartDate: string | null,
    previousDueDate: string | null,
    nextDueDate: string | null,
    userId?: string,
  ) {
    await this.logEvent(
      hiveId,
      HiveEventType.TASK_DATES_CHANGED,
      {
        assignmentId,
        taskId,
        taskTitle,
        previousStartDate,
        nextStartDate,
        previousDueDate,
        nextDueDate,
      },
      userId,
    );
  }

  async logTaskCompleted(
    hiveId: string,
    assignmentId: string,
    taskId: string,
    taskTitle: string,
    userId?: string,
  ) {
    await this.logEvent(
      hiveId,
      HiveEventType.TASK_COMPLETED,
      { assignmentId, taskId, taskTitle },
      userId,
    );
  }

  async getHistoryForHive(hiveId: string, page = 1, limit = 20) {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.max(1, Math.min(limit, 50));

    const qb = this.hiveEventsRepository
      .createQueryBuilder('event')
      .leftJoin('event.user', 'user')
      .addSelect(['user.id', 'user.name', 'user.email'])
      .where('event.hiveId = :hiveId', { hiveId })
      .orderBy('event.createdAt', 'DESC')
      .skip((safePage - 1) * safeLimit)
      .take(safeLimit);

    const [items, total] = await qb.getManyAndCount();

    return { data: items, page: safePage, limit: safeLimit, total };
  }
}
