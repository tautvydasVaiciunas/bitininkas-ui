import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
