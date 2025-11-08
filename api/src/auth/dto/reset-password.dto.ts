import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString({ message: 'Trūksta atstatymo kodo' })
  token!: string;

  @IsString({ message: 'Slaptažodis privalomas' })
  @MinLength(6, { message: 'Slaptažodis turi būti bent 6 simbolių' })
  newPassword!: string;
}
