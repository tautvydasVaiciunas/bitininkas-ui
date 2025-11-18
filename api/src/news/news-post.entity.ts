import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Group } from '../groups/group.entity';
import { Task } from '../tasks/task.entity';

@Entity({ name: 'news_posts' })
export class NewsPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  body!: string;

  @Column({ name: 'image_url', type: 'varchar', length: 1024, nullable: true })
  imageUrl!: string | null;

  @Column({ name: 'target_all', type: 'boolean', default: true })
  targetAll!: boolean;

  @Column({ name: 'attached_task_id', type: 'uuid', nullable: true })
  attachedTaskId!: string | null;

  @ManyToOne(() => Task, { eager: false })
  @JoinColumn({ name: 'attached_task_id' })
  attachedTask?: Task | null;

  @Column({ name: 'assignment_start_date', type: 'date', nullable: true })
  assignmentStartDate!: string | null;

  @Column({ name: 'assignment_due_date', type: 'date', nullable: true })
  assignmentDueDate!: string | null;

  @Column({ name: 'send_notifications', type: 'boolean', default: true })
  sendNotifications!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToMany(() => Group, { eager: false })
  @JoinTable({
    name: 'news_post_groups',
    joinColumn: { name: 'post_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'group_id', referencedColumnName: 'id' },
  })
  groups!: Group[];
}
