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
import { User } from './user.entity';

@Entity({ name: 'user_service_contracts' })
@Unique('UQ_user_service_contracts_user_id', ['userId'])
@Unique('UQ_user_service_contracts_contract_number', ['contractNumber'])
export class UserServiceContract {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'contract_number', type: 'varchar', length: 80, nullable: true })
  contractNumber!: string | null;

  @Column({ name: 'signed_at', type: 'timestamptz' })
  signedAt!: Date;

  @Column({ name: 'template_hash', type: 'varchar', length: 128 })
  templateHash!: string;

  @Column({ name: 'template_version', type: 'varchar', length: 64 })
  templateVersion!: string;

  @Column({ name: 'snapshot_markdown', type: 'text' })
  snapshotMarkdown!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

