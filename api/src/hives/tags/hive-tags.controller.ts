import { Body, Controller, Get, Post } from '@nestjs/common';
import { HiveTagsService } from './hive-tags.service';
import { CreateHiveTagDto } from './dto/create-hive-tag.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../users/user.entity';

@Controller('hive-tags')
export class HiveTagsController {
  constructor(private readonly hiveTagsService: HiveTagsService) {}

  @Get()
  findAll() {
    return this.hiveTagsService.findAll();
  }

  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateHiveTagDto) {
    return this.hiveTagsService.create(dto);
  }
}
