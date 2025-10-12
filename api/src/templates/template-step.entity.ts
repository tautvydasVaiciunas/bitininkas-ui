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

import { Template } from './template.entity';
import { TaskStep } from '../tasks/steps/task-step.entity';

@Entity({ name: 'template_steps' })
@Unique(['templateId', 'orderIndex'])
export class TemplateStep {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Template, (template) => template.steps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template!: Template;

  @Column({ name: 'template_id', type: 'uuid' })
  templateId!: string;

  @ManyToOne(() => TaskStep, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_step_id' })
  taskStep!: TaskStep;

  @Column({ name: 'task_step_id', type: 'uuid' })
  taskStepId!: string;

  @Column({ name: 'order_index', type: 'int' })
  orderIndex!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
