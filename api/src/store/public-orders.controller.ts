import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';

import { StoreOrdersService } from './store-orders.service';
import { Public } from '../common/decorators/public.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt.guard';

@Controller('store/orders')
@UseGuards(OptionalJwtAuthGuard)
export class PublicStoreOrdersController {
  constructor(private readonly ordersService: StoreOrdersService) {}

  @Public()
  @Post()
  create(@Body() dto: CreateOrderDto, @Request() req: any) {
    const userId = req?.user?.id ?? null;
    return this.ordersService.createOrder(dto, userId ?? undefined);
  }
}
