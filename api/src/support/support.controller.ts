import { Body, Controller, Get, Inject, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SupportService } from './support.service';
import { CreateAttachmentDto, CreateMessageDto } from './dto/create-message.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { InjectRepository } from '@nestjs/typeorm';
import { User, UserRole } from '../users/user.entity';
import { Repository, In } from 'typeorm';
import { Request } from 'express';

@UseGuards(JwtAuthGuard)
@Controller('support')
export class SupportController {
  constructor(
    private readonly supportService: SupportService,
    private readonly notificationsService: NotificationsService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @Get('my-thread')
  async getThread(@Req() request: Request) {
    const userId = request.user?.['id'];
    if (!userId) {
      return null;
    }

    const thread = await this.supportService.findOrCreateThreadForUser(userId);
    return {
      id: thread.id,
      status: thread.status,
      lastMessageAt: thread.lastMessageAt,
    };
  }

  @Get('my-thread/messages')
  async listMessages(
    @Req() request: Request,
    @Query('limit', ParseIntPipe) limit = 20,
    @Query('cursor') cursor?: string,
  ) {
    const userId = request.user?.['id'];
    if (!userId) {
      return [];
    }

    const thread = await this.supportService.findOrCreateThreadForUser(userId);
    const cursorDate = cursor ? new Date(cursor) : undefined;
    const messages = await this.supportService.listMessages(thread.id, limit, cursorDate);

    await this.supportService.markReadByUser(thread.id);

    return messages.map((message) => ({
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
    }));
  }

  @Post('my-thread/messages')
  async createMessage(@Req() request: Request, @Body() body: CreateMessageDto) {
    const userId = request.user?.['id'] ?? null;
    if (!userId) {
      return null;
    }

    const thread = await this.supportService.findOrCreateThreadForUser(userId);
    const mapAttachment = (attachment: CreateAttachmentDto) => ({
      url: attachment.url,
      mimeType: attachment.mimeType,
      kind: attachment.kind,
      sizeBytes: attachment.sizeBytes ?? 0,
    });

    const message = await this.supportService.createMessage(thread.id, {
      text: body.text ?? null,
      senderUserId: userId,
      senderRole: 'user',
      attachments: (body.attachments ?? []).map(mapAttachment),
    });

    const staffUsers = await this.userRepository.find({
      where: { role: In([UserRole.ADMIN, UserRole.MANAGER]) },
    });

    const notifBody =
      body.text && body.text.trim().length
        ? body.text.trim().slice(0, 180)
        : 'Vartotojas pridėjo priedą prie support žinutės.';

    await Promise.all(
      staffUsers.map((staff) =>
        this.notificationsService.createNotification(staff.id, {
          type: 'message',
          title: 'Nauja support žinutė',
          body: notifBody,
          link: `/admin/support?threadId=${thread.id}`,
        }),
      ),
    );

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

  @Get('my-thread/unread')
  async hasUnread(@Req() request: Request) {
    const userId = request.user?.['id'];
    if (!userId) {
      return { unread: false };
    }

    const thread = await this.supportService.findOrCreateThreadForUser(userId);
    const hasUnread = await this.supportService.threadHasUnreadFromStaff(thread.id);
    return { unread: hasUnread };
  }
}
