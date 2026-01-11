import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

const sanitizeNameInput = (value: unknown) => {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized;
};

export class UpdateProfileDto {
  @IsOptional()
  @IsString({ message: 'Vardas turi būti tekstas' })
  @Transform(({ value }) => sanitizeNameInput(value))
  @MaxLength(20, { message: 'Vardo ilgis negali viršyti 20 simbolių.' })
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
