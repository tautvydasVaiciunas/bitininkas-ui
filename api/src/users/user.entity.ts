import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Hive } from '../hives/hive.entity';
import { Task } from '../tasks/task.entity';
import { Assignment } from '../assignments/assignment.entity';
import { Notification } from '../notifications/notification.entity';
import { ActivityLog } from '../activity-log/activity-log.entity';
import { GroupMember } from '../groups/group-member.entity';
import { PasswordResetToken } from '../auth/password-reset-token.entity';

export enum UserRole {
  USER = 'user',
  MANAGER = 'manager',
  ADMIN = 'admin',
}

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

@Column({ type: 'varchar', length: 150, nullable: true, default: null })
name!: string | null;

@Column({ type: 'varchar', length: 50, nullable: true, default: null })
phone!: string | null;

@Column({ type: 'varchar', length: 255, nullable: true, default: null })
address!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;

  @OneToMany(() => Hive, (hive) => hive.owner)
  hives: Hive[];

  @ManyToMany(() => Hive, (hive) => hive.members)
  memberHives: Hive[];

  @OneToMany(() => Task, (task) => task.createdBy)
  tasks: Task[];

  @OneToMany(() => Assignment, (assignment) => assignment.createdBy)
  assignments: Assignment[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];

  @OneToMany(() => ActivityLog, (log) => log.user)
  activities: ActivityLog[];

  @OneToMany(() => GroupMember, (membership) => membership.user)
  groupMemberships: GroupMember[];

  @OneToMany(() => PasswordResetToken, (token) => token.user)
  passwordResetTokens: PasswordResetToken[];
}
