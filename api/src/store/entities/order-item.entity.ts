import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { StoreOrder } from './order.entity';
import { StoreProduct } from './product.entity';

@Entity({ name: 'store_order_items' })
export class StoreOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @ManyToOne(() => StoreOrder, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: StoreOrder;

  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId?: string | null;

  @ManyToOne(() => StoreProduct, { nullable: true })
  @JoinColumn({ name: 'product_id' })
  product?: StoreProduct | null;

  @Column({ name: 'product_title', type: 'varchar', length: 200 })
  productTitle!: string;

  @Column({ name: 'unit_price_cents', type: 'integer' })
  unitPriceCents!: number;

  @Column({ type: 'integer' })
  quantity!: number;

  @Column({ name: 'line_total_cents', type: 'integer' })
  lineTotalCents!: number;
}
