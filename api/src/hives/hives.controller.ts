import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Request,
  forwardRef,
} from '@nestjs/common';

import { Roles } from '../common/decorators/roles.decorator';
import { AssignmentsService } from '../assignments/assignments.service';
import { CreateHiveDto } from './dto/create-hive.dto';
import { UpdateHiveDto } from './dto/update-hive.dto';
import { HiveStatus } from './hive.entity';
import { HivesService } from './hives.service';
import { UserRole } from '../users/user.entity';

@Controller("hives")
export class HivesController {
  constructor(
    private readonly hivesService: HivesService,
    @Inject(forwardRef(() => AssignmentsService))
    private readonly assignmentsService: AssignmentsService,
  ) {}

  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @Post()
  async create(@Body() dto: CreateHiveDto, @Request() req) {
    return this.hivesService.create(dto, req.user.id, req.user.role);
  }

  @Get()
  async findAll(@Request() req, @Query("status") status?: HiveStatus) {
    return this.hivesService.findAll(req.user.id, req.user.role, status);
  }

  @Get(":id")
  async findOne(@Param("id") id: string, @Request() req) {
    return this.hivesService.findOne(id, req.user.id, req.user.role);
  }

  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateHiveDto,
    @Request() req,
  ) {
    return this.hivesService.update(id, dto, req.user.id, req.user.role);
  }

  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @Delete(":id")
  async remove(@Param("id") id: string, @Request() req) {
    return this.hivesService.remove(id, req.user.id, req.user.role);
  }

  @Get(":id/summary")
  async summary(@Param("id") id: string, @Request() req) {
    return this.assignmentsService.calculateHiveSummary(id, req.user);
  }
}
