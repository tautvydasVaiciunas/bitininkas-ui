import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { HiveStatus } from '../hive.entity';

export class CreateHiveDto {
  @IsString({ message: 'Avilio pavadinimas privalomas' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'Avilio pavadinimas privalomas' })
  @MinLength(1, { message: 'Avilio pavadinimas privalomas' })
  @MaxLength(150, { message: 'Avilio pavadinimas per ilgas' })
  label!: string;

  @IsOptional()
  @IsString({ message: 'Vieta turi būti tekstas' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(255, { message: 'Vieta per ilga' })
  location?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Motinėlės metai turi būti skaičius' })
  queenYear?: number;

  @IsOptional()
  @IsEnum(HiveStatus, { message: 'Neteisinga avilio būsena' })
  status?: HiveStatus;

  @IsOptional()
  @IsString({ message: 'Savininko ID turi būti tekstas' })
  ownerUserId?: string;

  @IsOptional()
  @IsArray({ message: 'Narių sąrašas turi būti masyvas' })
  @IsString({ each: true, message: 'Narių ID turi būti tekstiniai' })
  members?: string[];

  @IsOptional()
  @IsArray({ message: 'Naudotojų sąrašas turi būti masyvas' })
  @IsString({ each: true, message: 'Naudotojų ID turi būti tekstiniai' })
  userIds?: string[];
}
