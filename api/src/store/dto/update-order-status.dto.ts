import { IsEnum } from 'class-validator';

import { StoreOrderStatus } from '../entities/order.entity';

export class UpdateOrderStatusDto {
  @IsEnum(StoreOrderStatus, { message: 'Netinkama statuso reikšmė' })
  status!: StoreOrderStatus;
}

