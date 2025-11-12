import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Assignment } from '../assignments/assignment.entity';
import { HiveTag } from './tags/hive-tag.entity';

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

  @Column({ name: 'owner_user_id', type: 'uuid' })
  ownerUserId!: string;

  @ManyToMany(() => User, (user) => user.memberHives, { cascade: false })
  @JoinTable({
    name: 'hive_members',
    joinColumn: { name: 'hive_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  members: User[];

  @Column({ type: 'varchar', length: 150 })
  label!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  location!: string | null;

  @Column({ name: 'queen_year', type: 'integer', nullable: true })
  queenYear!: number | null;

  @Column({ type: 'enum', enum: HiveStatus, default: HiveStatus.ACTIVE })
  status: HiveStatus;

  @ManyToOne(() => HiveTag, { nullable: true, eager: false })
  @JoinColumn({ name: 'tag_id' })
  tag?: HiveTag | null;

  @Column({ name: 'tag_id', type: 'uuid', nullable: true })
  tagId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;

  @OneToMany(() => Assignment, (assignment) => assignment.hive)
  assignments: Assignment[];
}
