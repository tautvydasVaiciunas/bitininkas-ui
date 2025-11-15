import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SupportThread } from './support-thread.entity';
import { SupportAttachment } from './support-attachment.entity';

@Entity({ name: 'support_messages' })
export class SupportMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'thread_id', type: 'uuid' })
  threadId!: string;

  @ManyToOne(() => SupportThread, (thread) => thread.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'thread_id' })
  thread!: SupportThread;

  @Column({ name: 'sender_user_id', type: 'uuid', nullable: true })
  senderUserId!: string | null;

  @Column({ name: 'sender_role', type: 'varchar', length: 32 })
  senderRole!: 'user' | 'admin' | 'manager' | 'system';

  @Column({ type: 'text', nullable: true })
  text!: string | null;

  @Column({ name: 'has_attachments', type: 'boolean', default: false })
  hasAttachments!: boolean;

  @Column({ name: 'read_by_user', type: 'boolean', default: false })
  readByUser!: boolean;

  @Column({ name: 'read_by_staff', type: 'boolean', default: false })
  readByStaff!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => SupportAttachment, (attachment) => attachment.message)
  attachments!: SupportAttachment[];
}
