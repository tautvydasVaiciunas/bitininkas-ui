import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Neteisingas el. pašto adresas' })
  @MaxLength(255, { message: 'El. paštas per ilgas' })
  email!: string;

  @IsString({ message: 'Slaptažodis privalomas' })
  @MinLength(6, { message: 'Slaptažodis turi būti bent 6 simbolių' })
  password!: string;

  @IsOptional()
  @IsString({ message: 'Vardas turi būti tekstas' })
  @MaxLength(150, { message: 'Vardas per ilgas' })
  name?: string;
}
