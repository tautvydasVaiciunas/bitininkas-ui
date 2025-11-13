import { Body, Controller, Post, Request } from '@nestjs/common';

import { StoreOrdersService } from './store-orders.service';
import { Public } from '../common/decorators/public.decorator';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('store/orders')
export class PublicStoreOrdersController {
  constructor(private readonly ordersService: StoreOrdersService) {}

  @Public()
  @Post()
  create(@Body() dto: CreateOrderDto, @Request() req: any) {
    const userId = req?.user?.id ?? undefined;
    return this.ordersService.createOrder(dto, userId);
  }
}
