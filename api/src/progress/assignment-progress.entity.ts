import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { Assignment } from '../assignments/assignment.entity';
import { TaskStep } from '../tasks/steps/task-step.entity';
import { User } from '../users/user.entity';

export enum AssignmentProgressStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
}

@Entity({ name: 'assignment_progress' })
@Unique(['assignmentId', 'taskStepId', 'userId'])
export class AssignmentProgress {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Assignment, (assignment) => assignment.progress, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'assignment_id' })
  assignment!: Assignment;

  @Column({ name: 'assignment_id', type: 'uuid' })
  assignmentId!: string;

  @ManyToOne(() => TaskStep, (taskStep) => taskStep.progress, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'task_step_id' })
  taskStep!: TaskStep;

  @Column({ name: 'task_step_id', type: 'uuid' })
  taskStepId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({
    type: 'enum',
    enum: AssignmentProgressStatus,
    default: AssignmentProgressStatus.PENDING,
  })
  status!: AssignmentProgressStatus;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'varchar', length: 1000, nullable: true, default: null })
  notes!: string | null;

  @Column({
    name: 'evidence_url',
    type: 'varchar',
    length: 500,
    nullable: true,
    default: null,
  })
  evidenceUrl!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
