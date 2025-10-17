import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Netinkamas puslapio numeris' })
  @Min(1, { message: 'Puslapio numeris turi būti teigiamas' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Netinkamas kiekio parametras' })
  @Min(1, { message: 'Per mažas rezultatų kiekis' })
  @Max(100, { message: 'Per didelis rezultatų kiekis' })
  limit?: number;
}
