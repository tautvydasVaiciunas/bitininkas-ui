import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { Task } from '../task.entity';
import { StepProgress } from '../../progress/step-progress.entity';

@Entity({ name: 'task_steps' })
@Unique(['taskId', 'orderIndex'])
export class TaskStep {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Task, (task) => task.steps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task!: Task;

  @Column({ name: 'task_id', type: 'uuid' })
  taskId!: string;

  @Column({ name: 'order_index', type: 'int' })
  orderIndex!: number;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({
    name: 'content_text',
    type: 'varchar',
    length: 1000,
    nullable: true,
    default: null,
  })
  contentText!: string | null;

  @Column({
    name: 'media_url',
    type: 'varchar',
    length: 500,
    nullable: true,
    default: null,
  })
  mediaUrl!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => StepProgress, (progress) => progress.taskStep)
  progress!: StepProgress[];
}
