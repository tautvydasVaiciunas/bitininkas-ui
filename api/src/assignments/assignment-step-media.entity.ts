import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Assignment } from './assignment.entity';
import { TaskStep } from '../tasks/steps/task-step.entity';
import { User } from '../users/user.entity';

@Entity({ name: 'assignment_step_media' })
export class AssignmentStepMedia {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Assignment, { onDelete: 'CASCADE' })
  assignment!: Assignment;

  @Column({ name: 'assignment_id', type: 'uuid' })
  assignmentId!: string;

  @ManyToOne(() => TaskStep, { onDelete: 'CASCADE' })
  step!: TaskStep;

  @Column({ name: 'step_id', type: 'uuid' })
  stepId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 512 })
  url!: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 255 })
  mimeType!: string;

  @Column({ type: 'varchar', length: 32 })
  kind!: string;

  @Column({ name: 'size_bytes', type: 'int' })
  sizeBytes!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
