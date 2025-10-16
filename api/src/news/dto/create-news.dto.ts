import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateNewsDto {
  @IsString({ message: 'Pavadinimas privalomas' })
  @MaxLength(255, { message: 'Pavadinimas per ilgas' })
  title!: string;

  @IsString({ message: 'Tekstas privalomas' })
  body!: string;

  @IsOptional()
  @IsString({ message: 'Netinkamas paveikslėlio adresas' })
  imageUrl?: string | null;

  @IsOptional()
  @IsBoolean({ message: 'Netinkamas matomumo formatas' })
  targetAll?: boolean;

  @IsOptional()
  @IsArray({ message: 'Grupės turi būti sąrašas' })
  @IsUUID('4', { each: true, message: 'Neteisingas grupės identifikatorius' })
  groupIds?: string[];
}
