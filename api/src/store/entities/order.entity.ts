import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { StoreOrderItem } from './order-item.entity';
import { User } from '../../users/user.entity';

export enum StoreOrderStatus {
  NEW = 'new',
  CANCELLED = 'cancelled',
}

@Entity({ name: 'store_orders' })
export class StoreOrder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: StoreOrderStatus,
    default: StoreOrderStatus.NEW,
  })
  status!: StoreOrderStatus;

  @Column({ name: 'customer_name', type: 'varchar', length: 180 })
  customerName!: string;

  @Index('IDX_STORE_ORDERS_CUSTOMER_EMAIL')
  @Column({ name: 'customer_email', type: 'varchar', length: 180 })
  customerEmail!: string;

  @Column({ name: 'customer_phone', type: 'varchar', length: 60 })
  customerPhone!: string;

  @Column({ name: 'company_name', type: 'varchar', length: 180, nullable: true })
  companyName?: string | null;

  @Column({ name: 'company_code', type: 'varchar', length: 60, nullable: true })
  companyCode?: string | null;

  @Column({ name: 'vat_code', type: 'varchar', length: 60, nullable: true })
  vatCode?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address?: string | null;

  @Column({ type: 'text', nullable: true })
  comment?: string | null;

  @Column({ name: 'total_amount_cents', type: 'integer' })
  totalAmountCents!: number;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;

  @OneToMany(() => StoreOrderItem, (item) => item.order, { cascade: ['insert'] })
  items!: StoreOrderItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
