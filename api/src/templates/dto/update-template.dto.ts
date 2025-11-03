import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateTemplateDto {
  @IsOptional()
  @IsString({ message: 'Pavadinimas turi būti tekstas' })
  @IsNotEmpty({ message: 'Šablono pavadinimas privalomas' })
  @MaxLength(255, { message: 'Pavadinimas gali būti iki 255 simbolių' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Aprašymas turi būti tekstas' })
  @MaxLength(1000, { message: 'Aprašymas gali būti iki 1000 simbolių' })
  description?: string | null;

  @IsOptional()
  @IsArray({ message: 'Žingsniai turi būti masyvas' })
  @IsUUID('4', { each: true, message: 'Žingsnio ID turi būti teisingas UUID' })
  stepIds?: string[];
}
