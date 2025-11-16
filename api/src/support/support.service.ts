import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { SupportAttachment } from './entities/support-attachment.entity';
import { SupportMessage } from './entities/support-message.entity';
import { SupportThread } from './entities/support-thread.entity';

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
@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(SupportThread)
    private readonly threadRepository: Repository<SupportThread>,
    @InjectRepository(SupportMessage)
    private readonly messageRepository: Repository<SupportMessage>,
    @InjectRepository(SupportAttachment)
    private readonly attachmentRepository: Repository<SupportAttachment>,
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
    const message = this.messageRepository.create({
      threadId,
      senderUserId: input.senderUserId,
      senderRole: input.senderRole,
      text: input.text ?? null,
      hasAttachments: Array.isArray(input.attachments) && input.attachments.length > 0,
      readByUser: input.senderRole !== 'user',
      readByStaff: input.senderRole === 'user' ? false : true,
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
      { threadId, readByUser: false, senderRole: 'admin' },
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
      where: { threadId, senderRole: 'admin', readByUser: false },
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

    const result = await Promise.all(
      threads.map(async (thread) => {
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
      }),
    );

    return result;
  }
}
