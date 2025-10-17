import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Neteisingas el. pašto adresas' })
  email!: string;

  @IsString({ message: 'Slaptažodis privalomas' })
  @MinLength(1, { message: 'Slaptažodis privalomas' })
  password!: string;
}
