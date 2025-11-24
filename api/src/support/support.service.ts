import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';
import { SupportAttachment } from './entities/support-attachment.entity';
import { SupportMessage } from './entities/support-message.entity';
import { SupportThread } from './entities/support-thread.entity';
import { EmailService } from '../email/email.service';
import { User, UserRole } from '../users/user.entity';
import { ConfigService } from '@nestjs/config';
import { resolveFrontendUrl } from '../common/utils/frontend-url';

export type SupportSenderRole = 'user' | 'admin' | 'manager' | 'system';

export interface CreateAttachmentInput {
  url: string;
  mimeType: string;
  sizeBytes: number;
  kind: 'image' | 'video' | 'other';
}

export interface CreateMessageInput {
  text?: string | null;
  senderUserId: string | null;
  senderRole: SupportSenderRole;
  attachments?: CreateAttachmentInput[];
}

export interface ThreadListOptions {
  query?: string;
  status?: string;
  limit?: number;
  page?: number;
}

export interface SupportThreadAdminView {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  status: string;
  lastMessageText: string | null;
  lastMessageAt: Date | null;
  unreadFromUser: number;
}
const STAFF_ROLES: SupportSenderRole[] = ['admin', 'manager'];

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);
  private readonly EMAIL_COOLDOWN_MS = 5 * 60 * 1000;
  private readonly MESSAGE_LINK = '/messages';
  constructor(
    @InjectRepository(SupportThread)
    private readonly threadRepository: Repository<SupportThread>,
    @InjectRepository(SupportMessage)
    private readonly messageRepository: Repository<SupportMessage>,
    @InjectRepository(SupportAttachment)
    private readonly attachmentRepository: Repository<SupportAttachment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async findOrCreateThreadForUser(userId: string): Promise<SupportThread> {
    let thread = await this.threadRepository.findOne({
      where: { userId },
    });

    if (!thread) {
      thread = this.threadRepository.create({
        userId,
        status: 'open',
      });
      thread = await this.threadRepository.save(thread);
    }

    return thread;
  }

  async listMessages(
    threadId: string,
    limit = 20,
    cursor?: Date,
  ): Promise<SupportMessage[]> {
    const thread = await this.threadRepository.findOne({
      where: { id: threadId },
    });

    if (!thread) {
      return [];
    }

    const where: Record<string, unknown> = {
      threadId: thread.id,
    };

    if (cursor) {
      where.createdAt = LessThan(cursor);
    }

    return this.messageRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      relations: {
        attachments: true,
      },
    });
  }

  async createMessage(threadId: string, input: CreateMessageInput): Promise<SupportMessage> {
    const isUserSender = input.senderRole === 'user';
    const message = this.messageRepository.create({
      threadId,
      senderUserId: input.senderUserId,
      senderRole: input.senderRole,
      text: input.text ?? null,
      hasAttachments: Array.isArray(input.attachments) && input.attachments.length > 0,
      readByUser: isUserSender,
      readByStaff: !isUserSender,
    });

    const savedMessage = await this.messageRepository.save(message);

    if (Array.isArray(input.attachments)) {
      const attachments = input.attachments.map((attachment) =>
        this.attachmentRepository.create({
          messageId: savedMessage.id,
          url: attachment.url,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
          kind: attachment.kind,
        }),
      );
      await this.attachmentRepository.save(attachments);
      savedMessage.attachments = attachments;
    }

    await this.threadRepository.update(threadId, { lastMessageAt: savedMessage.createdAt });

    if (STAFF_ROLES.includes(input.senderRole)) {
      await this.sendStaffMessageEmail(threadId);
    }

    return savedMessage;
  }

  async findThreadById(threadId: string): Promise<SupportThread | null> {
    return this.threadRepository.findOne({
      where: { id: threadId },
      relations: ['user'],
    });
  }

  async markReadByUser(threadId: string): Promise<void> {
    await this.messageRepository.update(
      { threadId, readByUser: false, senderRole: In(STAFF_ROLES) },
      { readByUser: true },
    );
  }

  async markReadByStaff(threadId: string): Promise<void> {
    await this.messageRepository.update(
      { threadId, readByStaff: false, senderRole: 'user' },
      { readByStaff: true },
    );
  }

  async threadHasUnreadFromStaff(threadId: string): Promise<boolean> {
    const count = await this.messageRepository.count({
      where: { threadId, senderRole: In(STAFF_ROLES), readByUser: false },
      take: 1,
    });
    return count > 0;
  }

  async listThreadsForAdmin(options: ThreadListOptions) {
    const limit = options.limit ?? 20;
    const page = options.page && options.page > 0 ? options.page : 1;

    const threads = await this.threadRepository.find({
      relations: {
        user: true,
      },
      where: options.status ? { status: options.status } : undefined,
      order: {
        lastMessageAt: 'DESC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return Promise.all(threads.map((thread) => this.buildAdminThreadView(thread)));
  }

  async ensureThreadForAdmin(userId: string) {
    const thread = await this.findOrCreateThreadForUser(userId);
    return this.buildAdminThreadView(thread);
  }

  private async buildAdminThreadView(thread: SupportThread): Promise<SupportThreadAdminView> {
    const [lastMessage, unreadFromUser] = await Promise.all([
      this.messageRepository.findOne({
        where: { threadId: thread.id },
        order: { createdAt: 'DESC' },
      }),
      this.messageRepository.count({
        where: {
          threadId: thread.id,
          senderRole: 'user',
          readByStaff: false,
        },
      }),
    ]);

    return {
      id: thread.id,
      userId: thread.userId,
      userName: thread.user?.name ?? null,
      userEmail: thread.user?.email ?? null,
      status: thread.status,
      lastMessageText: lastMessage?.text ?? null,
      lastMessageAt: lastMessage?.createdAt ?? thread.lastMessageAt,
      unreadFromUser,
    };
  }

  private async sendStaffMessageEmail(threadId: string) {
    const thread = await this.threadRepository.findOne({
      where: { id: threadId },
      relations: { user: true },
    });

    const threadUser = thread?.user;
    if (!threadUser || threadUser.role !== UserRole.USER || !threadUser.email) {
      return;
    }

    const now = new Date();
    if (threadUser.lastMessageEmailAt) {
      const elapsed = now.getTime() - threadUser.lastMessageEmailAt.getTime();
      if (elapsed < this.EMAIL_COOLDOWN_MS) {
        return;
      }
    }

    const messageLink = resolveFrontendUrl(this.configService, this.MESSAGE_LINK);
    const body = [
      'Gavote naują žinutę.',
      `Atsakyti: ${messageLink}`,
    ].join('\n');
    const html = body
      .split('\n')
      .map((line) => `<p>${line}</p>`)
      .join('');

    try {
      await this.emailService.sendMail({
        to: threadUser.email,
        subject: 'Nauja žinutė iš Bus medaus bitininko',
        text: body,
        html,
      });
      threadUser.lastMessageEmailAt = now;
      await this.userRepository.save(threadUser);
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Nepavyko išsiųsti support laiško ${threadUser.email}: ${details}`);
    }
  }

  async countThreadsWithUnreadFromUser(): Promise<number> {
    const rows = await this.messageRepository
      .createQueryBuilder('message')
      .select('message.threadId', 'threadId')
      .where('message.senderRole = :role', { role: 'user' })
      .andWhere('message.readByStaff = false')
      .groupBy('message.threadId')
      .getRawMany<{ threadId: string }>();

    return rows.length;
  }
}
