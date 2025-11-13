import { PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
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
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Slug turi būti tekstas' })
  @Matches(/^[a-z0-9-]+$/i, {
    message: 'Slug gali turėti tik raides, skaičius ir brūkšnelius',
  })
  @MaxLength(140, { message: 'Slug per ilgas' })
  slug?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Kaina turi būti sveikas skaičius (centais)' })
  @Min(1, { message: 'Kaina turi būti teigiama' })
  priceCents?: number;
}
