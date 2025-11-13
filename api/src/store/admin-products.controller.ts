import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { StoreProductsService } from './store-products.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';

@Controller('admin/store/products')
@Roles(UserRole.MANAGER, UserRole.ADMIN)
export class AdminStoreProductsController {
  constructor(private readonly productsService: StoreProductsService) {}

  @Get()
  list(@Query() query: ListProductsQueryDto) {
    return this.productsService.listForAdmin(query);
  }

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  deactivate(@Param('id') id: string) {
    return this.productsService.deactivate(id);
  }
}
