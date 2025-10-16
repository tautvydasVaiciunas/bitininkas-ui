import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListNewsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Netinkamas puslapio numeris' })
  @Min(1, { message: 'Puslapio numeris turi būti teigiamas' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Netinkamas kiekio parametras' })
  @Min(1, { message: 'Per mažas rezultatų kiekis' })
  @Max(50, { message: 'Per didelis rezultatų kiekis' })
  limit?: number;
}
