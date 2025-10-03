import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hive, HiveStatus } from './hive.entity';
import { CreateHiveDto } from './dto/create-hive.dto';
import { UpdateHiveDto } from './dto/update-hive.dto';
import { UserRole } from '../users/user.entity';
import { ActivityLogService } from '../activity-log/activity-log.service';

@Injectable()
export class HivesService {
  constructor(
    @InjectRepository(Hive)
    private readonly hiveRepository: Repository<Hive>,
    private readonly activityLog: ActivityLogService,
  ) {}

  async create(dto: CreateHiveDto, userId: string, role: UserRole) {
    const ownerUserId = dto.ownerUserId && role !== UserRole.USER ? dto.ownerUserId : userId;
    const hive = this.hiveRepository.create({
      ...dto,
      ownerUserId,
    });
    const saved = await this.hiveRepository.save(hive);
    await this.activityLog.log('hive_created', userId, 'hive', saved.id);
    return saved;
  }

  async findAll(userId: string, role: UserRole, status?: HiveStatus) {
    const where: any = {};
    if (role === UserRole.USER) {
      where.ownerUserId = userId;
    }
    if (status) {
      where.status = status;
    }
    return this.hiveRepository.find({ where });
  }

  async findOne(id: string, userId: string, role: UserRole) {
    const hive = await this.hiveRepository.findOne({ where: { id } });
    if (!hive) {
      throw new NotFoundException('Hive not found');
    }
    if (role === UserRole.USER && hive.ownerUserId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return hive;
  }

  async update(id: string, dto: UpdateHiveDto, userId: string, role: UserRole) {
    const hive = await this.findOne(id, userId, role);
    Object.assign(hive, dto);
    const saved = await this.hiveRepository.save(hive);
    await this.activityLog.log('hive_updated', userId, 'hive', id);
    return saved;
  }

  async remove(id: string, userId: string, role: UserRole) {
    const hive = await this.findOne(id, userId, role);
    await this.hiveRepository.softDelete(id);
    await this.activityLog.log('hive_deleted', userId, 'hive', id);
    return { success: true };
  }
}
