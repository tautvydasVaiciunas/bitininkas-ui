import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Logger,
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
import { HiveEventsService } from './hive-events.service';

@Controller("hives")
export class HivesController {
  private readonly logger = new Logger(HivesController.name);

  constructor(
    private readonly hivesService: HivesService,
    @Inject(forwardRef(() => AssignmentsService))
    private readonly assignmentsService: AssignmentsService,
    private readonly hiveEventsService: HiveEventsService,
  ) {}

  private isDevEnvironment() {
    return process.env.NODE_ENV !== 'production';
  }

  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @Post()
  async create(@Body() dto: CreateHiveDto, @Request() req) {
    const hive = await this.hivesService.create(dto, req.user.id, req.user.role);

    if (this.isDevEnvironment()) {
      this.logger.debug('hives create', { id: hive.id });
    }

    return hive;
  }

  @Get()
  async findAll(@Request() req, @Query("status") status?: HiveStatus) {
    const hives = await this.hivesService.findAll(req.user.id, req.user.role, status);

    if (this.isDevEnvironment()) {
      this.logger.debug('hives list', { count: hives.length });
    }

    return hives;
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

  @Get(':id/history')
  async history(
    @Param('id') id: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Request() req,
  ) {
    await this.hivesService.findOne(id, req.user.id, req.user.role);
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 20, 50));
    return this.hiveEventsService.getHistoryForHive(id, parsedPage, parsedLimit);
  }
}
