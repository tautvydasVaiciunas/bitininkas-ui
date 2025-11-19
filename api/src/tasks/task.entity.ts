import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from '../users/user.entity';
import { TaskStep } from './steps/task-step.entity';
import { Assignment } from '../assignments/assignment.entity';
import { Template } from '../templates/template.entity';
import { NewsPost } from '../news/news-post.entity';

export enum TaskFrequency {
  ONCE = 'once',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

@Entity({ name: 'tasks' })
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  category!: string | null;

  @Column({
    name: 'season_months',
    type: 'int',
    array: true,
    default: () => 'ARRAY[]::INTEGER[]',
  })
  seasonMonths!: number[];

  @Column({ type: 'enum', enum: TaskFrequency, default: TaskFrequency.ONCE })
  frequency!: TaskFrequency;

  @Column({ name: 'default_due_days', type: 'int', default: 7 })
  defaultDueDays!: number;

  @ManyToOne(() => Template, { eager: false })
  @JoinColumn({ name: 'template_id' })
  template?: Template | null;

  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId!: string | null;

  @ManyToOne(() => User, (user) => user.tasks, { eager: false })
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy!: User;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @OneToMany(() => TaskStep, (step) => step.task, { cascade: true })
  steps!: TaskStep[];

  @OneToMany(() => Assignment, (assignment) => assignment.task)
  assignments!: Assignment[];

  @OneToMany(() => NewsPost, (post) => post.attachedTask)
  newsPosts!: NewsPost[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt!: Date | null;
}
