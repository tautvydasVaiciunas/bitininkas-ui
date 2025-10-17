import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateGroupDto {
  @IsString({ message: 'Grupės pavadinimas privalomas' })
  @MinLength(1, { message: 'Grupės pavadinimas privalomas' })
  @MaxLength(150, { message: 'Grupės pavadinimas per ilgas' })
  name!: string;

  @IsOptional()
  @IsString({ message: 'Aprašymas turi būti tekstas' })
  @MaxLength(255, { message: 'Aprašymas per ilgas' })
  description?: string;
}
