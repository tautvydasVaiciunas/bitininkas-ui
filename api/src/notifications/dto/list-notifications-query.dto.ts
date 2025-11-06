import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

export class ListNotificationsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Netinkamas kiekio parametras' })
  @Min(1, { message: 'Per mažas rezultatų kiekis' })
  @Max(100, { message: 'Per didelis rezultatų kiekis' })
  override limit?: number;
}
