import { Body, Controller, Delete, Get, Param, Patch, Post, Request } from '@nestjs/common';

import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { ReorderTemplateStepsDto } from './dto/reorder-template-steps.dto';
import { TemplatesService } from './templates.service';

@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  findAll() {
    return this.templatesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateTemplateDto, @Request() req) {
    return this.templatesService.create(dto, req.user);
  }

  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTemplateDto, @Request() req) {
    return this.templatesService.update(id, dto, req.user);
  }

  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.templatesService.remove(id, req.user);
  }

  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @Post(':id/steps/reorder')
  reorder(@Param('id') id: string, @Body() dto: ReorderTemplateStepsDto, @Request() req) {
    return this.templatesService.reorderSteps(
      id,
      dto.steps.map((step) => ({ id: step.id, orderIndex: step.orderIndex })),
      req.user,
    );
  }
}
