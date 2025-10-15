import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateTagDto {
  @IsString({ message: 'Žymės pavadinimas turi būti tekstas' })
  @IsNotEmpty({ message: 'Žymės pavadinimas privalomas' })
  @MaxLength(120, { message: 'Žymės pavadinimas gali būti iki 120 simbolių' })
  name!: string;
}
