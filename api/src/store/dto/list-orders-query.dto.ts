import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { StoreOrderStatus } from '../entities/order.entity';

export class ListOrdersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(StoreOrderStatus, { message: 'Netinkama statuso reikšmė' })
  status?: StoreOrderStatus;
}
