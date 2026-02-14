import { Body, Controller, Get, Inject, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SupportService } from './support.service';
import { CreateAttachmentDto, CreateMessageDto } from './dto/create-message.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { InjectRepository } from '@nestjs/typeorm';
import { User, UserRole } from '../users/user.entity';
import { Repository, In } from 'typeorm';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { resolveFrontendUrl } from '../common/utils/frontend-url';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { FeedbackService } from './feedback.service';
import { Throttle } from '@nestjs/throttler';
import { RATE_LIMIT_MAX, RATE_LIMIT_TTL_SECONDS } from '../common/config/security.config';

@UseGuards(JwtAuthGuard)
@Controller('support')
export class SupportController {
  constructor(
    private readonly supportService: SupportService,
    private readonly notificationsService: NotificationsService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly feedbackService: FeedbackService,
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
    const senderFallback = await this.userRepository.findOne({ where: { id: userId } });
    const senderEmail =
      (request.user?.['email'] as string | undefined)?.trim() || senderFallback?.email || null;
    const senderName =
      (request.user?.['name'] as string | undefined)?.trim() || senderFallback?.name || null;
    const senderLabel = senderName && senderEmail ? `${senderName} (${senderEmail})` : senderEmail;
    const conversationLink = `/admin/support?conversationId=${thread.id}&threadId=${thread.id}`;

    const notifBody =
      body.text && body.text.trim().length
        ? body.text.trim().slice(0, 180)
        : 'Vartotojas pridėjo priedą prie support žinutės.';

    await Promise.all(
      staffUsers.map((staff) =>
        this.notificationsService.createNotification(staff.id, {
          type: 'message',
          title: senderLabel
            ? `Nauja support žinutė nuo ${senderLabel}`
            : 'Nauja support žinutė',
          body: notifBody,
          link: resolveFrontendUrl(this.configService, conversationLink),
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

  @Post('feedback')
  @Throttle({
    default: {
      limit: RATE_LIMIT_MAX,
      ttl: RATE_LIMIT_TTL_SECONDS,
    },
  })
  async createFeedback(@Req() request: Request, @Body() body: CreateFeedbackDto) {
    const user = request.user ?? {};
    await this.feedbackService.sendFeedback(
      {
        message: body.message.trim(),
        pageUrl: body.pageUrl,
        pageTitle: body.pageTitle,
        deviceInfo: body.deviceInfo,
        attachments: body.attachments,
        context: body.context,
      },
      {
        userId: user['id'] ?? null,
        userEmail: user['email'] ?? null,
        userName: user['name'] ?? null,
        ip: request.ip ?? null,
        forwardedIp: (request.headers['x-forwarded-for'] as string | undefined) ?? null,
        userAgent: request.headers['user-agent'] ?? null,
        timestamp: new Date().toISOString(),
      },
    );

    return { success: true };
  }
}

