import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import { IsDateOnlyString } from '../../common/validators/is-date-only-string.decorator';

export class BulkFromTemplateDto {
  @IsUUID('4', { message: 'Neteisingi duomenys' })
  templateId!: string;

  @IsArray({ message: 'Pasirinkite bent vieną grupę' })
  @ArrayNotEmpty({ message: 'Pasirinkite bent vieną grupę' })
  @IsUUID('4', { each: true, message: 'Neteisingi duomenys' })
  groupIds!: string[];

  @IsString({ message: 'Pavadinimas privalomas' })
  @IsNotEmpty({ message: 'Pavadinimas privalomas' })
  title!: string;

  @IsDateOnlyString({ message: 'Pradžios data turi būti formato YYYY-MM-DD' })
  startDate!: string;

  @IsDateOnlyString({ message: 'Pabaigos data turi būti formato YYYY-MM-DD' })
  dueDate!: string;

  @IsOptional()
  @IsBoolean({ message: 'Neteisingi duomenys' })
  notify?: boolean;
}
