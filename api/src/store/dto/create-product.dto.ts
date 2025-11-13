import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsString({ message: 'Slug privalomas' })
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug gali turėti tik mažąsias raides, skaičius ir brūkšnelius' })
  @MaxLength(140, { message: 'Slug per ilgas' })
  slug!: string;

  @IsString({ message: 'Pavadinimas privalomas' })
  @MaxLength(180, { message: 'Pavadinimas per ilgas' })
  title!: string;

  @IsOptional()
  @IsString({ message: 'Aprašymo santrauka turi būti tekstas' })
  @MaxLength(280, { message: 'Aprašymo santrauka per ilga' })
  shortDescription?: string;

  @IsString({ message: 'Aprašymas privalomas' })
  description!: string;

  @Transform(({ value }) => Number(value))
  @IsInt({ message: 'Kaina turi būti sveikas skaičius (centais)' })
  @Min(0, { message: 'Kaina negali būti neigiama' })
  priceCents!: number;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isActive?: boolean;
}
