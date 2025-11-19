import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { IsDateOnlyString } from '../../common/validators/is-date-only-string.decorator';

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

  @IsOptional()
  @IsBoolean()
  attachTask?: boolean;

  @IsOptional()
  @IsUUID('4', { message: 'Neteisingas šablono identifikatorius' })
  templateId?: string;

  @IsOptional()
  @IsString({ message: 'Užduoties pavadinimas turi būti tekstas' })
  taskTitle?: string;

  @IsOptional()
  @IsDateOnlyString({ message: 'Pradžios data turi būti YYYY-MM-DD formato' })
  assignmentStartDate?: string;

  @IsOptional()
  @IsDateOnlyString({ message: 'Pabaigos data turi būti YYYY-MM-DD formato' })
  assignmentDueDate?: string;

  @IsOptional()
  @IsBoolean({ message: 'Netinkamas pranešimų pasirinkimas' })
  sendNotifications?: boolean;
}
