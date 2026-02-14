import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Inject,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { NotificationsService } from '../notifications/notifications.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { SupportService } from './support.service';
import { AdminThreadListDto } from './dto/admin-thread-list.dto';
import { CreateAttachmentDto, CreateMessageDto } from './dto/create-message.dto';
import { CreateSupportThreadDto } from './dto/create-thread.dto';
import { Request } from 'express';
import { User, UserRole } from '../users/user.entity';
import { ConfigService } from '@nestjs/config';
import { resolveFrontendUrl } from '../common/utils/frontend-url';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller('admin/support')
export class SupportAdminController {
  constructor(
    private readonly supportService: SupportService,
    private readonly notificationsService: NotificationsService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  @Get('threads')
  async listThreads(@Query() query: AdminThreadListDto) {
    return this.supportService.listThreadsForAdmin({
      query: query.query,
      status: query.status,
      limit: query.limit,
      page: query.page,
    });
  }

  @Get('threads/:id/messages')
  async listMessages(
    @Param('id') id: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('cursor') cursor?: string,
  ) {
    const thread = await this.supportService.findThreadById(id);
    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    const cursorDate = cursor ? new Date(cursor) : undefined;
    const page = await this.supportService.listMessagesPage(thread.id, limit, cursorDate);
    await this.supportService.markReadByStaff(thread.id);

    return {
      messages: page.messages.map((message) => ({
        id: message.id,
        senderRole: message.senderRole,
        text: message.text,
        createdAt: message.createdAt,
        attachments: message.attachments?.map((attachment) => ({
          url: attachment.url,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
          kind: attachment.kind,
        })),
      })),
      hasMore: page.hasMore,
      nextCursor: page.nextCursor,
    };
  }

  @Get('threads/:id')
  async getThread(@Param('id') id: string) {
    const threadView = await this.supportService.getThreadViewForAdmin(id);
    if (!threadView) {
      throw new NotFoundException('Thread not found');
    }

    return threadView;
  }

  @Post('threads/:id/messages')
  async createMessage(@Param('id') id: string, @Body() body: CreateMessageDto, @Req() request: Request) {
    const thread = await this.supportService.findThreadById(id);
    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    const user = request.user as User;
    const mapAttachment = (attachment: CreateAttachmentDto) => ({
      url: attachment.url,
      mimeType: attachment.mimeType,
      kind: attachment.kind,
      sizeBytes: attachment.sizeBytes ?? 0,
    });

    const message = await this.supportService.createMessage(thread.id, {
      text: body.text ?? null,
      senderUserId: user?.id ?? null,
      senderRole: user?.role === UserRole.MANAGER ? 'manager' : 'admin',
      attachments: (body.attachments ?? []).map(mapAttachment),
    });

    await this.supportService.markReadByStaff(thread.id);

    await this.notificationsService.createNotification(thread.userId, {
      type: 'message',
      title: 'Atsakymas iš Bus medaus komandos',
      body: 'Gavote atsakymą į support pokalbį.',
      link: resolveFrontendUrl(this.configService, '/support'),
    });

    return {
      id: message.id,
      senderRole: message.senderRole,
      text: message.text,
      createdAt: message.createdAt,
      attachments: message.attachments?.map((attachment) => ({
        url: attachment.url,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        kind: attachment.kind,
      })),
    };
  }

  @Get('unread-count')
  async getUnreadCount() {
    const count = await this.supportService.countThreadsWithUnreadFromUser();
    return { count };
  }

  @Post('threads')
  async ensureThread(@Body() body: CreateSupportThreadDto) {
    const user = await this.userRepository.findOne({
      where: { id: body.userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.supportService.ensureThreadForAdmin(user.id);
  }
}
