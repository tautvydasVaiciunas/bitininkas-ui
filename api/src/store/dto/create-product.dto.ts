import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const toBoolean = ({ value }: { value: unknown }) => {
  if (typeof value === 'string') {
    return value === 'true';
  }

  return value === true;
};

export class CreateProductDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @Matches(/^[a-z0-9-]+$/i, {
    message: 'Slug gali turėti tik raides, skaičius ir brūkšnelius',
  })
  @MaxLength(140, { message: 'Slug per ilgas' })
  slug?: string;

  @Transform(trimString)
  @IsString({ message: 'Pavadinimas privalomas' })
  @MinLength(1, { message: 'Pavadinimas privalomas' })
  @MaxLength(180, { message: 'Pavadinimas per ilgas' })
  title!: string;

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: 'Aprašymo santrauka turi būti tekstas' })
  @MaxLength(280, { message: 'Aprašymo santrauka per ilga' })
  shortDescription?: string;

  @Transform(trimString)
  @IsString({ message: 'Aprašymas privalomas' })
  @MinLength(1, { message: 'Aprašymas privalomas' })
  description!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 },
    { message: 'Kaina turi būti skaičius' },
  )
  @Min(0.01, { message: 'Kaina turi būti teigiama' })
  price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Kaina turi būti sveikas skaičius (centais)' })
  @Min(1, { message: 'Kaina turi būti teigiama' })
  priceCents?: number;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isActive?: boolean;
}
