import { IsInt, IsOptional, IsString, Max, Min, MaxLength } from 'class-validator';

export class RateAssignmentDto {
  @IsInt({ message: 'Rating turi būti sveikas skaičius' })
  @Min(1, { message: 'Rating turi būti nuo 1 iki 5' })
  @Max(5, { message: 'Rating turi būti nuo 1 iki 5' })
  rating!: number;

  @IsOptional()
  @IsString({ message: 'Komentaras turi būti tekstas' })
  @MaxLength(1000, { message: 'Komentaras gali būti iki 1000 simbolių' })
  ratingComment?: string | null;
}
