import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { UserRole } from '../user.entity';

export class CreateUserDto {
  @IsEmail({}, { message: 'Neteisingas el. pašto adresas' })
  @MaxLength(255, { message: 'El. paštas per ilgas' })
  email!: string;

  @IsString({ message: 'Slaptažodis privalomas' })
  @MinLength(6, { message: 'Slaptažodis turi būti bent 6 simbolių' })
  password!: string;

  @IsEnum(UserRole, { message: 'Neteisinga rolė' })
  @IsOptional()
  role?: UserRole;

  @IsOptional()
  @IsString({ message: 'Vardas turi būti tekstas' })
  @MaxLength(150, { message: 'Vardas per ilgas' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Telefono numeris turi būti tekstas' })
  @MaxLength(50, { message: 'Telefono numeris per ilgas' })
  phone?: string;

  @IsOptional()
  @IsString({ message: 'Adresas turi būti tekstas' })
  @MaxLength(255, { message: 'Adresas per ilgas' })
  address?: string;
}
