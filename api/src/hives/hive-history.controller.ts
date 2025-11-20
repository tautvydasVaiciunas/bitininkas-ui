import { Body, Controller, Delete, Param, Post, Patch, Request } from '@nestjs/common';

import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { HiveEventsService } from './hive-events.service';
import { HivesService } from './hives.service';
import { CreateManualNoteDto, UpdateManualNoteDto } from './dto/manual-note.dto';

@Controller('hives')
export class HiveHistoryController {
  constructor(
    private readonly hiveEventsService: HiveEventsService,
    private readonly hivesService: HivesService,
  ) {}

  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @Post(':id/history/manual')
  async createManualNote(
    @Param('id') hiveId: string,
    @Body() dto: CreateManualNoteDto,
    @Request() req,
  ) {
    await this.hivesService.findOne(hiveId, req.user.id, req.user.role);
    return this.hiveEventsService.createManualNote(hiveId, dto, req.user.id);
  }

  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @Patch('history/:eventId')
  async updateManualNote(@Param('eventId') eventId: string, @Body() dto: UpdateManualNoteDto) {
    return this.hiveEventsService.updateManualNote(eventId, dto);
  }

  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @Delete('history/:eventId')
  async deleteManualNote(@Param('eventId') eventId: string) {
    await this.hiveEventsService.deleteManualNote(eventId);
    return { success: true };
  }
}
