import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { TemplateStepWithOrderDto } from './template-step-with-order.dto';

export class UpdateTemplateDto {
  @IsOptional()
  @IsString({ message: 'Pavadinimas turi būti tekstas' })
  @IsNotEmpty({ message: 'Šablono pavadinimas privalomas' })
  @MaxLength(255, { message: 'Pavadinimas gali būti iki 255 simbolių' })
  title?: string;

  @IsOptional()
  @IsString({ message: 'Komentaras turi būti tekstas' })
  @MaxLength(1000, { message: 'Komentaras gali būti iki 1000 simbolių' })
  comment?: string | null;

  @IsOptional()
  @IsArray({ message: 'Žingsniai turi būti masyvas' })
  @ArrayMinSize(1, { message: 'Turi būti bent vienas žingsnis' })
  @ValidateNested({ each: true })
  @Type(() => TemplateStepWithOrderDto)
  stepsWithOrder?: TemplateStepWithOrderDto[];

  @IsOptional()
  @IsArray({ message: 'Žingsniai turi būti masyvas' })
  @ArrayMinSize(1, { message: 'Turi būti bent vienas žingsnis' })
  @IsUUID('4', { each: true, message: 'Žingsnio ID turi būti teisingas UUID' })
  steps?: string[];
}
