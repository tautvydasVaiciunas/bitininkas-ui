import { IsEmail } from 'class-validator';

export class RequestResetDto {
  @IsEmail({}, { message: 'Neteisingas el. pašto adresas' })
  email!: string;
}
