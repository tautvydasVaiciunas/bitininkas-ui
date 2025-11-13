import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StoreProduct } from './entities/product.entity';
import { StoreOrder } from './entities/order.entity';
import { StoreOrderItem } from './entities/order-item.entity';
import { StoreProductsService } from './store-products.service';
import { StoreOrdersService } from './store-orders.service';
import { PublicStoreProductsController } from './public-products.controller';
import { AdminStoreProductsController } from './admin-products.controller';
import { PublicStoreOrdersController } from './public-orders.controller';
import { AdminStoreOrdersController } from './admin-orders.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([StoreProduct, StoreOrder, StoreOrderItem]),
    NotificationsModule,
  ],
  controllers: [
    PublicStoreProductsController,
    AdminStoreProductsController,
    PublicStoreOrdersController,
    AdminStoreOrdersController,
  ],
  providers: [StoreProductsService, StoreOrdersService],
  exports: [StoreProductsService, StoreOrdersService],
})
export class StoreModule {}
