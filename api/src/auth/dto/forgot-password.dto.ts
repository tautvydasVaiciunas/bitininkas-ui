import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Neteisingas el. pašto adresas' })
  email!: string;
}
