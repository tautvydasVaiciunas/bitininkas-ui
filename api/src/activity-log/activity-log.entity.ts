import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from '../users/user.entity';

@Entity({ name: 'activity_logs' })
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, (user) => user.activities, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user!: User | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true, default: null })
  userId!: string | null;

  @Column({ type: 'text' })
  action!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  entity!: string | null;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true, default: null })
  entityId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
