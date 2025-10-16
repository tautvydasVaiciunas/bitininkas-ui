import { Controller, Get, Param, Query, Request } from '@nestjs/common';

import { NewsService } from './news.service';
import { ListNewsQueryDto } from './dto/list-news-query.dto';

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  list(@Request() req, @Query() query: ListNewsQueryDto) {
    const userId = req?.user?.id ?? null;
    return this.newsService.listForUser(userId, query);
  }

  @Get(':id')
  details(@Param('id') id: string, @Request() req) {
    const userId = req?.user?.id ?? null;
    return this.newsService.findOneForUser(id, userId);
  }
}
