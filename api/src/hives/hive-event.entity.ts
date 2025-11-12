import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Hive } from './hive.entity';
import { User } from '../users/user.entity';

export enum HiveEventType {
  HIVE_UPDATED = 'HIVE_UPDATED',
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_DATES_CHANGED = 'TASK_DATES_CHANGED',
  TASK_COMPLETED = 'TASK_COMPLETED',
}

@Entity({ name: 'hive_events' })
export class HiveEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'hive_id', type: 'uuid' })
  hiveId!: string;

  @ManyToOne(() => Hive, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hive_id' })
  hive!: Hive;

  @Column({ type: 'enum', enum: HiveEventType })
  type!: HiveEventType;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  payload!: Record<string, unknown>;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
