import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { TaskFrequency } from '../task.entity';
import { CreateTaskStepInputDto } from './create-task-step.dto';

export class CreateTaskDto {
  @IsString({ message: 'Pavadinimas privalo būti tekstas' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'Pavadinimas privalomas' })
  @MinLength(1, { message: 'Pavadinimas privalomas' })
  @MaxLength(255, { message: 'Pavadinimas per ilgas' })
  title!: string;

  @IsOptional()
  @IsString({ message: 'Kategorija turi būti tekstas' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(100, { message: 'Kategorija per ilga' })
  category?: string;

  @IsOptional()
  @IsArray({ message: 'Mėnesiai turi būti sąrašas' })
  @IsNumber({}, { each: true, message: 'Mėnesiai turi būti skaičiai' })
  @Min(1, { each: true, message: 'Mėnesio reikšmė turi būti nuo 1 iki 12' })
  @Max(12, { each: true, message: 'Mėnesio reikšmė turi būti nuo 1 iki 12' })
  seasonMonths?: number[];

  @IsOptional()
  @IsEnum(TaskFrequency, { message: 'Dažnumas turi būti daily, weekly arba monthly' })
  frequency?: TaskFrequency;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Numatytas terminų skaičius turi būti skaičius' })
  @Min(0, { message: 'Numatytas terminų skaičius negali būti mažesnis už 0' })
  defaultDueDays?: number;

  @IsOptional()
  @IsArray({ message: 'Žingsniai turi būti sąrašas' })
  @ValidateNested({ each: true })
  @Type(() => CreateTaskStepInputDto)
  steps?: CreateTaskStepInputDto[];
}
