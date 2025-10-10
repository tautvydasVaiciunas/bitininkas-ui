import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AddGroupMemberDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  role?: string;
}
