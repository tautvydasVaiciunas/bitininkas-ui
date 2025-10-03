import { Controller, Get, Param, Patch, Request } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async list(@Request() req) {
    return this.notificationsService.findForUser(req.user.id);
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string, @Request() req) {
    return this.notificationsService.markRead(id, req.user.id);
  }
}
