import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AddGroupMemberDto {
  @IsUUID('4', { message: 'Neteisingas naudotojo identifikatorius' })
  userId!: string;

  @IsOptional()
  @IsString({ message: 'Rolė turi būti tekstas' })
  @MaxLength(50, { message: 'Rolė per ilga' })
  role?: string;
}
