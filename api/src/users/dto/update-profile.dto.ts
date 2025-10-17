import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString({ message: 'Vardas turi būti tekstas' })
  @MaxLength(150, { message: 'Vardas per ilgas' })
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Neteisingas el. pašto adresas' })
  @MaxLength(255, { message: 'El. paštas per ilgas' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'Telefono numeris turi būti tekstas' })
  @MaxLength(50, { message: 'Telefono numeris per ilgas' })
  phone?: string;

  @IsOptional()
  @IsString({ message: 'Adresas turi būti tekstas' })
  @MaxLength(255, { message: 'Adresas per ilgas' })
  address?: string;
}
