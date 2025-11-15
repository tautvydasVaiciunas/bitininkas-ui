import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    const query = this.messageRepository
      .createQueryBuilder('message')
      .where('message.thread_id = :threadId', { threadId })
      .orderBy('message.created_at', 'DESC')
      .take(limit);

    if (cursor) {
      query.andWhere('message.created_at < :cursor', { cursor });
    }

    return query.leftJoinAndSelect('message.attachments', 'attachment').getMany();
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

    const qb = this.threadRepository
      .createQueryBuilder('thread')
      .leftJoinAndSelect('thread.user', 'user')
      .orderBy('thread.last_message_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (options.status) {
      qb.andWhere('thread.status = :status', { status: options.status });
    }

    if (options.query) {
      qb.andWhere('(user.name ILIKE :query OR user.email ILIKE :query)', {
        query: `%${options.query}%`,
      });
    }

    const threads = await qb.getMany();
    const threadIds = threads.map((thread) => thread.id);

    const lastMessages = await this.messageRepository
      .createQueryBuilder('message')
      .where('message.thread_id IN (:...threadIds)', { threadIds })
      .orderBy('message.created_at', 'DESC')
      .getMany();

    const unreadCounts = await this.messageRepository
      .createQueryBuilder('message')
      .select('message.thread_id', 'threadId')
      .addSelect('COUNT(*)', 'count')
      .where('message.thread_id IN (:...threadIds)', { threadIds })
      .andWhere('message.sender_role = :role', { role: 'user' })
      .andWhere('message.read_by_staff = false')
      .groupBy('message.thread_id')
      .getRawMany();

    const unreadMap = new Map<string, number>();
    unreadCounts.forEach((entry) => {
      if (entry.threadid && Number(entry.count)) {
        unreadMap.set(entry.threadid, Number(entry.count));
      }
    });

    return threads.map((thread) => {
      const lastMessage = lastMessages.find((message) => message.threadId === thread.id);
      return {
        id: thread.id,
        userId: thread.userId,
        userName: thread.user?.name ?? null,
        userEmail: thread.user?.email ?? null,
        status: thread.status,
        lastMessageText: lastMessage?.text ?? null,
        lastMessageAt: thread.lastMessageAt,
        unreadFromUser: unreadMap.get(thread.id) ?? 0,
      };
    });
  }
}
