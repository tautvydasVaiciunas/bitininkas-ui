import { Controller, Get, Param, Query, Request } from '@nestjs/common';

import { NewsService } from './news.service';
import { ListNewsQueryDto } from './dto/list-news-query.dto';

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  list(@Request() req, @Query() query: ListNewsQueryDto) {
    return this.newsService.listForUser(req.user.id, query);
  }

  @Get(':id')
  details(@Param('id') id: string, @Request() req) {
    return this.newsService.findOneForUser(id, req.user.id);
  }
}
