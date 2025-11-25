import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Hive } from '../hives/hive.entity';
import { Task } from '../tasks/task.entity';
import { User } from '../users/user.entity';
import { AssignmentProgress } from '../progress/assignment-progress.entity';

export enum AssignmentStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
}

export enum AssignmentReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity({ name: 'assignments' })
@Index('IDX_ASSIGNMENTS_HIVE_ID', ['hiveId'])
@Index('IDX_ASSIGNMENTS_CREATED_AT', ['createdAt'])
export class Assignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Hive, (hive) => hive.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hive_id' })
  hive!: Hive;

  @Column({ name: 'hive_id', type: 'uuid' })
  hiveId!: string;

  @ManyToOne(() => Task, (task) => task.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task!: Task;

  @Column({ name: 'task_id', type: 'uuid' })
  taskId!: string;

  @ManyToOne(() => User, (user) => user.assignments, { eager: false })
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy!: User;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @Column({ name: 'due_date', type: 'date' })
  dueDate!: string;

  @Column({ name: 'start_date', type: 'date', nullable: true, default: null })
  startDate!: string | null;

  @Column({
    type: 'enum',
    enum: AssignmentStatus,
    default: AssignmentStatus.NOT_STARTED,
  })
  status!: AssignmentStatus;

  @Column({ name: 'notified_start', type: 'boolean', default: false })
  notifiedStart!: boolean;

  @Column({ type: 'boolean', nullable: false, default: false })
  archived!: boolean;

  @Column({ name: 'notified_due_soon', type: 'boolean', default: false })
  notifiedDueSoon!: boolean;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({
    name: 'review_status',
    type: 'enum',
    enum: AssignmentReviewStatus,
    default: AssignmentReviewStatus.PENDING,
  })
  reviewStatus!: AssignmentReviewStatus;

  @Column({ name: 'review_comment', type: 'text', nullable: true })
  reviewComment!: string | null;

  @Column({ name: 'review_by_user_id', type: 'uuid', nullable: true })
  reviewByUserId!: string | null;

  @Column({ name: 'review_at', type: 'timestamptz', nullable: true })
  reviewAt!: Date | null;

  @Column({ type: 'smallint', nullable: true, default: null })
  rating!: number | null;

  @Column({ name: 'rating_comment', type: 'text', nullable: true })
  ratingComment!: string | null;

  @Column({ name: 'rated_at', type: 'timestamptz', nullable: true })
  ratedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => AssignmentProgress, (progress) => progress.assignment)
  progress!: AssignmentProgress[];
}
