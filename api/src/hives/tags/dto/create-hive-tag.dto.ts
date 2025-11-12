import { IsHexColor, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateHiveTagDto {
  @IsString({ message: 'Zymos pavadinimas turi buti tekstas' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'Zymos pavadinimas privalomas' })
  @MaxLength(120, { message: 'Zymos pavadinimas per ilgas' })
  name!: string;

  @IsOptional()
  @IsHexColor({ message: 'Zymos spalva turi buti HEX formatu' })
  color?: string;
}
