import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { Assignment } from '../assignments/assignment.entity';
import { TaskStep } from '../tasks/steps/task-step.entity';

@Entity({ name: 'step_progress' })
@Unique(['assignmentId', 'taskStepId'])
export class StepProgress {
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

  @CreateDateColumn({ name: 'completed_at' })
  completedAt!: Date;

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
}
