import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateHiveTagDto {
  @IsString({ message: 'Žymos pavadinimas turi buti tekstas' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'Žymos pavadinimas privalomas' })
  @MaxLength(120, { message: 'Žymos pavadinimas per ilgas' })
  name!: string;
}
