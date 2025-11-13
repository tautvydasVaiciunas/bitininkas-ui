import { Controller, Get, Param } from '@nestjs/common';

import { StoreProductsService } from './store-products.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('store/products')
export class PublicStoreProductsController {
  constructor(private readonly productsService: StoreProductsService) {}

  @Public()
  @Get()
  list() {
    return this.productsService.listPublic();
  }

  @Public()
  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.productsService.findPublicBySlug(slug);
  }
}
