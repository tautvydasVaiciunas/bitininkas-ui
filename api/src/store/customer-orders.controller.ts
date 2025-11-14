import { Controller, Get, Request, UnauthorizedException } from '@nestjs/common';

import { StoreOrdersService } from './store-orders.service';

@Controller('store/my-orders')
export class StoreCustomerOrdersController {
  constructor(private readonly ordersService: StoreOrdersService) {}

  @Get()
  list(@Request() req: any) {
    const userId = req?.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Prisijunkite, kad matytumėte užsakymus');
    }

    return this.ordersService.listOrdersForUser(userId);
  }
}
