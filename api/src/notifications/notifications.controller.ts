import { Controller, Get, Param, Patch, Query, Request } from '@nestjs/common';

import { NotificationsService } from './notifications.service';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async list(@Request() req, @Query() query: ListNotificationsQueryDto) {
    return this.notificationsService.list(req.user.id, query);
  }

  @Get('unread-count')
  async unreadCount(@Request() req) {
    const count = await this.notificationsService.countUnreadForUser(req.user.id);
    return { count };
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string, @Request() req) {
    await this.notificationsService.markAsRead(id, req.user.id);
    return { success: true };
  }

  @Patch('mark-all-read')
  async markAllRead(@Request() req) {
    await this.notificationsService.markAllAsRead(req.user.id);
    return { success: true };
  }
}
