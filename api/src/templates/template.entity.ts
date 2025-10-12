import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { TemplateStep } from './template-step.entity';

@Entity({ name: 'templates' })
export class Template {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @OneToMany(() => TemplateStep, (step) => step.template, {
    cascade: true,
    eager: false,
    orphanedRowAction: 'delete',
  })
  steps!: TemplateStep[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
