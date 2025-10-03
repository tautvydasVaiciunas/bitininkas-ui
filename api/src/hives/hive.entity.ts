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
import { Assignment } from '../assignments/assignment.entity';

export enum HiveStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived',
}

@Entity({ name: 'hives' })
export class Hive {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.hives, { eager: false })
  @JoinColumn({ name: 'owner_user_id' })
  owner: User;

  @Column({ name: 'owner_user_id' })
  ownerUserId: string;

  @Column()
  label: string;

  @Column({ nullable: true })
  location?: string;

  @Column({ name: 'queen_year', type: 'integer', nullable: true })
  queenYear?: number;

  @Column({ type: 'enum', enum: HiveStatus, default: HiveStatus.ACTIVE })
  status: HiveStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;

  @OneToMany(() => Assignment, (assignment) => assignment.hive)
  assignments: Assignment[];
}
