import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import type { TaskStepMediaType } from '../steps/task-step.entity';

export class CreateTaskStepInputDto {
  @IsString({ message: 'Pavadinimas turi būti tekstas' })
  @IsNotEmpty({ message: 'Pavadinimas privalomas' })
  @MaxLength(255, { message: 'Pavadinimas gali būti iki 255 simbolių' })
  title: string;

  @IsOptional()
  @IsString({ message: 'Turinys turi būti tekstas' })
  @MaxLength(1000, { message: 'Turinys gali būti iki 1000 simbolių' })
  contentText?: string;

  @IsOptional()
  @IsString({ message: 'Nuoroda turi būti tekstas' })
  @MaxLength(500, { message: 'Nuoroda gali būti iki 500 simbolių' })
  @Matches(/^(?:\/uploads\/|https?:\/\/).+/i, {
    message: 'Nuoroda turi prasidėti /uploads/ arba http(s):// adresu',
  })
  mediaUrl?: string;

  @IsOptional()
  @IsIn(['image', 'video'], { message: 'Netinkamas media tipas' })
  mediaType?: TaskStepMediaType;

  @IsOptional()
  @IsBoolean({ message: 'Reikia vartotojo nuotraukos turi būti teisinga/neteisinga reikšmė' })
  requireUserMedia?: boolean;

  @IsOptional()
  @IsInt({ message: 'Eilės numeris turi būti sveikas skaičius' })
  @Min(1, { message: 'Eilės numeris turi būti teigiamas' })
  orderIndex?: number;

  @IsOptional()
  @IsArray({ message: 'Žymės turi būti sąrašas' })
  @ArrayUnique({ message: 'Žymės negali kartotis' })
  @IsUUID('4', { each: true, message: 'Žymės turi būti teisingi ID' })
  tagIds?: string[];
}
