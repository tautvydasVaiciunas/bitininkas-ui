import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';

import { NewsService } from './news.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { ListNewsQueryDto } from './dto/list-news-query.dto';

@Controller('admin/news')
@Roles(UserRole.MANAGER, UserRole.ADMIN)
export class AdminNewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  list(@Query() query: ListNewsQueryDto) {
    return this.newsService.listForAdmin(query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.newsService.findOneForAdmin(id);
  }

  @Post()
  create(@Body() dto: CreateNewsDto, @Request() req) {
    return this.newsService.create(dto, req.user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateNewsDto) {
    return this.newsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.newsService.remove(id);
  }
}
