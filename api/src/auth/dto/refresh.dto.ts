import { IsString, MinLength } from 'class-validator';

export class RefreshDto {
  @IsString({ message: 'Atnaujinimo žetonas privalomas' })
  @MinLength(1, { message: 'Atnaujinimo žetonas privalomas' })
  refreshToken!: string;
}
