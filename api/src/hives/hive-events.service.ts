import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HiveEvent, HiveEventType } from './hive-event.entity';
import { Hive } from './hive.entity';
import { User } from '../users/user.entity';
import { NotificationsService, CreateNotificationPayload } from '../notifications/notifications.service';
import { CreateManualNoteDto, UpdateManualNoteDto } from './dto/manual-note.dto';

@Injectable()
export class HiveEventsService {
  constructor(
    @InjectRepository(HiveEvent)
    private readonly hiveEventsRepository: Repository<HiveEvent>,
    @InjectRepository(Hive)
    private readonly hiveRepository: Repository<Hive>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly notifications: NotificationsService,
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

  private ensureManualNote(event: HiveEvent) {
    if (event.type !== HiveEventType.MANUAL_NOTE) {
      throw new BadRequestException('Manual note not found');
    }
  }

  private async loadHiveWithMembers(hiveId: string) {
    const hive = await this.hiveRepository.findOne({
      where: { id: hiveId },
      relations: { owner: true, members: true },
    });

    if (!hive) {
      throw new NotFoundException('Avilys nerastas');
    }

    return hive;
  }

  private buildNotificationPayload(hive: Hive, text: string): CreateNotificationPayload {
    const snippet = text.length > 120 ? `${text.slice(0, 117)}...` : text;
    return {
      type: 'hive_history',
      title: 'Naujas įrašas avilio istorijoje',
      body: `${hive.label}: ${snippet}`,
      link: `/hives/${hive.id}?tab=history`,
      sendEmail: true,
      emailSubject: 'Naujas įrašas avilyje',
      emailBody: `Naujas įrašas avilio "${hive.label}" istorijoje:\n\n${text}`,
    };
  }

  private async notifyHiveManualNote(hive: Hive, text: string, creatorId?: string) {
    const recipients = new Set<string>();
    recipients.add(hive.ownerUserId);
    for (const member of hive.members ?? []) {
      recipients.add(member.id);
    }
    if (creatorId) {
      recipients.delete(creatorId);
    }

    const payload = this.buildNotificationPayload(hive, text);

    for (const userId of recipients) {
      await this.notifications.createNotification(userId, payload);
    }
  }

  async createManualNote(
    hiveId: string,
    dto: CreateManualNoteDto,
    userId?: string | null,
  ): Promise<HiveEvent> {
    const hive = await this.loadHiveWithMembers(hiveId);
    const payload = {
      text: dto.text.trim(),
      attachments: (dto.attachments ?? []).filter((attachment) => Boolean(attachment?.url?.trim())),
    };
    const event = await this.hiveEventsRepository.save(
      this.hiveEventsRepository.create({
        hiveId,
        type: HiveEventType.MANUAL_NOTE,
        payload,
        userId: userId ?? null,
      }),
    );
    await this.notifyHiveManualNote(hive, payload.text, userId ?? undefined);
    return event;
  }

  async updateManualNote(
    eventId: string,
    dto: UpdateManualNoteDto,
  ): Promise<HiveEvent> {
    const event = await this.hiveEventsRepository.findOne({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Įrašas nerastas');
    }

    if (event.type !== HiveEventType.MANUAL_NOTE) {
      throw new BadRequestException('Negalima redaguoti šio įrašo');
    }

    const payload = { ...(event.payload ?? {}) } as Record<string, unknown>;

    if (dto.text !== undefined) {
      payload.text = dto.text.trim();
    }

    if (dto.attachments !== undefined) {
      payload.attachments = dto.attachments;
    }

    event.payload = payload;

    return this.hiveEventsRepository.save(event);
  }

  async deleteManualNote(eventId: string) {
    const event = await this.hiveEventsRepository.findOne({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Įrašas nerastas');
    }

    if (event.type !== HiveEventType.MANUAL_NOTE) {
      throw new BadRequestException('Negalima trinti šio įrašo');
    }

    await this.hiveEventsRepository.remove(event);
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
