import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Inject,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
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
  ) {}

  private buildFeedbackMessage(body: CreateFeedbackDto) {
    const lines = ['[Atsiliepimas]'];

    const pageLabel = body.pageTitle?.trim() || body.pageUrl?.trim() || null;
    if (pageLabel) {
      lines.push(`Puslapis: ${pageLabel}`);
    }

    if (body.pageUrl?.trim() && body.pageUrl.trim() !== pageLabel) {
      lines.push(`Nuoroda: ${body.pageUrl.trim()}`);
    }

    lines.push('', body.message.trim());

    return lines.join('\n');
  }

  private async notifyStaffAboutUserMessage(
    threadId: string,
    userId: string,
    text: string | null | undefined,
    hasAttachments: boolean,
  ) {
    const staffUsers = await this.userRepository.find({
      where: { role: In([UserRole.ADMIN, UserRole.MANAGER]) },
    });
    const senderFallback = await this.userRepository.findOne({ where: { id: userId } });
    const senderEmail = senderFallback?.email?.trim() || null;
    const senderName = senderFallback?.name?.trim() || null;
    const senderLabel = senderName && senderEmail ? `${senderName} (${senderEmail})` : senderEmail;
    const conversationLink = `/admin/support?conversationId=${threadId}&threadId=${threadId}`;

    const trimmedText = text?.trim() ?? '';
    const notifBody = trimmedText.length
      ? trimmedText.slice(0, 180)
      : hasAttachments
        ? 'Vartotojas pridėjo priedą prie žinutės.'
        : 'Vartotojas atsiuntė naują žinutę.';

    await Promise.all(
      staffUsers.map((staff) =>
        this.notificationsService.createNotification(staff.id, {
          type: 'message',
          title: senderLabel ? `Žinutė nuo ${senderLabel}` : 'Žinutė nuo vartotojo',
          body: notifBody,
          link: resolveFrontendUrl(this.configService, conversationLink),
        }),
      ),
    );
  }

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
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('cursor') cursor?: string,
  ) {
    const userId = request.user?.['id'];
    if (!userId) {
      return { messages: [], hasMore: false, nextCursor: null };
    }

    const thread = await this.supportService.findOrCreateThreadForUser(userId);
    const cursorDate = cursor ? new Date(cursor) : undefined;
    const page = await this.supportService.listMessagesPage(thread.id, limit, cursorDate);

    await this.supportService.markReadByUser(thread.id);

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
    await this.notifyStaffAboutUserMessage(
      thread.id,
      userId,
      body.text,
      (body.attachments?.length ?? 0) > 0,
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
    const userId = request.user?.['id'] ?? null;
    if (!userId) {
      return { success: true };
    }

    const thread = await this.supportService.findOrCreateThreadForUser(userId);
    const message = await this.supportService.createMessage(thread.id, {
      text: this.buildFeedbackMessage(body),
      senderUserId: userId,
      senderRole: 'user',
      attachments: (body.attachments ?? []).map((attachment) => ({
        url: attachment.url,
        mimeType: attachment.mimeType ?? 'application/octet-stream',
        kind:
          attachment.mimeType?.startsWith('image/') ? 'image' : attachment.mimeType?.startsWith('video/') ? 'video' : 'other',
        sizeBytes: 0,
      })),
    });

    await this.notifyStaffAboutUserMessage(
      thread.id,
      userId,
      message.text,
      (body.attachments?.length ?? 0) > 0,
    );

    return { success: true };
  }
}


