import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateGlobalStepRequestDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Pavadinimas turi būti tekstas' })
  @IsNotEmpty({ message: 'Pavadinimas privalomas' })
  @MaxLength(255, { message: 'Pavadinimas gali būti iki 255 simbolių' })
  name!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Aprašymas turi būti tekstas' })
  @MaxLength(1000, { message: 'Aprašymas gali būti iki 1000 simbolių' })
  description?: string;

  @IsOptional()
  @IsArray({ message: 'Žymės turi būti sąrašas' })
  @ArrayUnique({ message: 'Žymės negali kartotis' })
  @IsUUID('4', { each: true, message: 'Žymės turi būti teisingi ID' })
  tagIds?: string[];
}
