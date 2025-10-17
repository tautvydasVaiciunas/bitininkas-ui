import { IsString, MinLength } from 'class-validator';

export class UpdatePasswordDto {
  @IsString({ message: 'Senas slaptažodis privalomas' })
  @MinLength(1, { message: 'Senas slaptažodis privalomas' })
  oldPassword!: string;

  @IsString({ message: 'Naujas slaptažodis privalomas' })
  @MinLength(6, { message: 'Naujas slaptažodis turi būti bent 6 simbolių' })
  newPassword!: string;
}
