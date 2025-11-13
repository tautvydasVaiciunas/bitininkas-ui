import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'store_products' })
export class StoreProduct {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('IDX_STORE_PRODUCTS_SLUG', { unique: true })
  @Column({ type: 'varchar', length: 140 })
  slug!: string;

  @Column({ type: 'varchar', length: 180 })
  title!: string;

  @Column({ name: 'short_description', type: 'varchar', length: 280, nullable: true })
  shortDescription?: string | null;

  @Column({ type: 'text' })
  description!: string;

  @Column({ name: 'price_cents', type: 'integer' })
  priceCents!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
