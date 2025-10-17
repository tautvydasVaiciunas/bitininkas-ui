import { Controller, Get, Param, Patch, Query, Request } from '@nestjs/common';

import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async list(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = page ? Number(page) : undefined;
    const parsedLimit = limit ? Number(limit) : undefined;

    return this.notificationsService.list(req.user.id, {
      page: parsedPage,
      limit: parsedLimit,
    });
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
