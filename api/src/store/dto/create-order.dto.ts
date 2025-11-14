import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class CreateOrderItemDto {
  @IsUUID('4', { message: 'Netinkamas produkto identifikatorius' })
  productId!: string;

  @Type(() => Number)
  @IsInt({ message: 'Kiekis turi būti sveikas skaičius' })
  @Min(1, { message: 'Mažiausias kiekis – 1' })
  quantity!: number;
}

class CreateOrderCustomerDto {
  @IsString({ message: 'Vardas privalomas' })
  @MaxLength(180, { message: 'Vardas per ilgas' })
  name!: string;

  @IsEmail({}, { message: 'Netinkamas el. pašto adresas' })
  @MaxLength(180, { message: 'El. pašto adresas per ilgas' })
  email!: string;

  @IsString({ message: 'Telefono numeris privalomas' })
  @MaxLength(60, { message: 'Telefono numeris per ilgas' })
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  companyCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  vatCode?: string;

  @IsString({ message: 'Adresas privalomas' })
  @MaxLength(255, { message: 'Adresas per ilgas' })
  address!: string;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1, { message: 'Pasirinkite bent vieną produktą' })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @ValidateNested()
  @Type(() => CreateOrderCustomerDto)
  customer!: CreateOrderCustomerDto;
}

export type CreateOrderItemPayload = CreateOrderItemDto;
export type CreateOrderCustomerPayload = CreateOrderCustomerDto;
