import { Controller, Get, Param, Query } from '@nestjs/common';

import { StoreOrdersService } from './store-orders.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';

@Controller('admin/store/orders')
@Roles(UserRole.MANAGER, UserRole.ADMIN)
export class AdminStoreOrdersController {
  constructor(private readonly ordersService: StoreOrdersService) {}

  @Get()
  list(@Query() query: ListOrdersQueryDto) {
    return this.ordersService.listForAdmin(query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.ordersService.getOrderDetails(id);
  }
}
