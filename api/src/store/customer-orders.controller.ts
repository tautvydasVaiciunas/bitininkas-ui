import { Controller, Get, Request, UseGuards } from '@nestjs/common';

import { StoreOrdersService } from './store-orders.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('store/my-orders')
@UseGuards(JwtAuthGuard)
export class StoreCustomerOrdersController {
  constructor(private readonly ordersService: StoreOrdersService) {}

  @Get()
  list(@Request() req: any) {
    return this.ordersService.listOrdersForUser(req.user.id);
  }
}
