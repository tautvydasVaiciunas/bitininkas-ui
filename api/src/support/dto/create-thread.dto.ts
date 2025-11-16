import { IsUUID } from 'class-validator';

export class CreateSupportThreadDto {
  @IsUUID()
  userId!: string;
}
