import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const normalizePrice = ({ value, obj }: { value: unknown; obj: Record<string, unknown> }) => {
  const raw = value ?? obj?.priceEur ?? obj?.priceEuro ?? obj?.priceValue;

  if (typeof raw === 'number') {
    return raw;
  }

  if (typeof raw === 'string') {
    const normalized = raw.replace(',', '.').replace(/\s+/g, '').trim();
    if (!normalized.length) {
      return NaN;
    }
    return Number(normalized);
  }

  return NaN;
};

const toBoolean = ({ value }: { value: unknown }) => value === true || value === 'true';

export class CreateProductDto {
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

  @Transform(normalizePrice)
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'Kaina turi būti skaičius' },
  )
  @Min(0.01, { message: 'Kaina turi būti teigiama' })
  price!: number;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isActive?: boolean;
}
