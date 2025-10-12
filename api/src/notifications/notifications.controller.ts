import { Controller, Get, Param, Patch, Request } from '@nestjs/common';

import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async list(@Request() req) {
    return this.notificationsService.findForUser(req.user.id);
  }

  @Get('unread-count')
  async unreadCount(@Request() req) {
    const count = await this.notificationsService.countUnreadForUser(req.user.id);
    return { count };
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string, @Request() req) {
    await this.notificationsService.markRead(id, req.user.id);
    return { success: true };
  }
}
