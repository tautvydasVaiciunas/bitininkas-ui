import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CompleteStepDto {
  @IsString({ message: 'Priskyrimo ID turi būti tekstas' })
  @IsUUID('4', { message: 'Neteisingas priskyrimo identifikatorius' })
  assignmentId!: string;

  @IsString({ message: 'Žingsnio ID turi būti tekstas' })
  @IsUUID('4', { message: 'Neteisingas žingsnio identifikatorius' })
  taskStepId!: string;

  @IsOptional()
  @IsString({ message: 'Pastabos turi būti tekstas' })
  @MaxLength(1000, { message: 'Pastabos gali būti iki 1000 simbolių' })
  notes?: string;

  @IsOptional()
  @IsString({ message: 'Įrodymo nuoroda turi būti tekstas' })
  @MaxLength(500, { message: 'Įrodymo nuoroda gali būti iki 500 simbolių' })
  @MinLength(1, { message: 'Įrodymo nuoroda negali būti tuščia' })
  evidenceUrl?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Neteisingas naudotojo identifikatorius' })
  userId?: string;
}
