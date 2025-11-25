import { IsInt, IsOptional, IsString, MaxLength, Max, Min } from 'class-validator';

export class SubmitAssignmentRatingDto {
  @IsInt({ message: 'Reitingas turi būti sveikasis skaičius' })
  @Min(1, { message: 'Reitingas turi būti ne mažesnis nei 1' })
  @Max(5, { message: 'Reitingas turi būti ne didesnis nei 5' })
  rating!: number;

  @IsOptional()
  @IsString({ message: 'Komentaras turi būti tekstas' })
  @MaxLength(1000, { message: 'Komentaras gali būti iki 1000 simbolių' })
  ratingComment?: string | null;
}
