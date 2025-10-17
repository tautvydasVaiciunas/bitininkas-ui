import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProgressDto {
  @IsOptional()
  @IsString({ message: 'Pastabos turi būti tekstas' })
  @MaxLength(1000, { message: 'Pastabos gali būti iki 1000 simbolių' })
  notes?: string;

  @IsOptional()
  @IsString({ message: 'Įrodymo nuoroda turi būti tekstas' })
  @MaxLength(500, { message: 'Įrodymo nuoroda gali būti iki 500 simbolių' })
  @MinLength(1, { message: 'Įrodymo nuoroda negali būti tuščia' })
  evidenceUrl?: string;
}
