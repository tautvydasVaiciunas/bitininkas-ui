import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @IsOptional()
  @IsString({ message: 'Slug turi būti tekstas' })
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug gali turėti tik mažąsias raides, skaičius ir brūkšnelius',
  })
  @MaxLength(140, { message: 'Slug per ilgas' })
  slug?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt({ message: 'Kaina turi būti sveikas skaičius (centais)' })
  @Min(0, { message: 'Kaina negali būti neigiama' })
  priceCents?: number;
}
