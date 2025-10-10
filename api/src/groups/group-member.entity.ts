import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Group } from './group.entity';
import { User } from '../users/user.entity';

@Entity({ name: 'group_members' })
@Unique(['groupId', 'userId'])
@Index(['groupId'])
@Index(['userId'])
export class GroupMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Group, (group) => group.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'group_id' })
  group: Group;

  @Column({ name: 'group_id' })
  groupId: string;

  @ManyToOne(() => User, (user) => user.groupMemberships, {
    eager: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    name: 'member_role',
    type: 'varchar',
    length: 50,
    nullable: true,
    default: null,
  })
  role!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
