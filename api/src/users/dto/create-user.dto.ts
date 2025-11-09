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

  @IsOptional()
  @IsString({ message: 'Slaptažodis turi buti tekstas' })
  @MinLength(6, { message: 'Jei nurodote, slaptažodis turi buti bent 6 simboliu' })
  password?: string;

  @IsEnum(UserRole, { message: 'Neteisinga role' })
  @IsOptional()
  role?: UserRole;

  @IsOptional()
  @IsString({ message: 'Vardas turi buti tekstas' })
  @MaxLength(150, { message: 'Vardas per ilgas' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Telefono numeris turi buti tekstas' })
  @MaxLength(50, { message: 'Telefono numeris per ilgas' })
  phone?: string;

  @IsOptional()
  @IsString({ message: 'Adresas turi buti tekstas' })
  @MaxLength(255, { message: 'Adresas per ilgas' })
  address?: string;
}
