import { OmitType, PartialType } from '@nestjs/mapped-types';
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['role'] as const),
) {
  @IsOptional()
  @IsString({ message: 'Slaptažodis turi būti tekstas' })
  @MinLength(6, { message: 'Slaptažodis turi būti bent 6 simbolių' })
  password?: string;

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

  @IsOptional()
  @IsDateString({}, { message: 'Prenumeratos galiojimo data turi būti ISO formato eilutė' })
  subscriptionValidUntil?: string | null;

  @IsOptional()
  @IsBoolean({ message: 'Ištrynimo statusas turi būti loginė reikšmė' })
  deleted?: boolean;
}
