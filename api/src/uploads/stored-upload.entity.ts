import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'stored_uploads' })
export class StoredUpload {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'relative_path', unique: true, length: 255 })
  relativePath!: string;

  @Column({ name: 'mime_type', length: 120 })
  mimeType!: string;

  @Column({ name: 'size_bytes', type: 'integer' })
  sizeBytes!: number;

  @Column({ type: 'bytea' })
  data!: Buffer;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
