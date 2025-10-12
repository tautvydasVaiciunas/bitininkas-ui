import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { Notification } from './notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repository: Repository<Notification>,
  ) {}

  async findForUser(userId: string) {
    return this.repository.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async countUnreadForUser(userId: string) {
    return this.repository.count({ where: { userId, readAt: IsNull() } });
  }

  async markRead(id: string, userId: string) {
    const notification = await this.repository.findOne({ where: { id, userId } });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (!notification.readAt) {
      notification.readAt = new Date();
      await this.repository.save(notification);
    }
  }
}
