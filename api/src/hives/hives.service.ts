import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Hive, HiveStatus } from './hive.entity';
import { CreateHiveDto } from './dto/create-hive.dto';
import { UpdateHiveDto } from './dto/update-hive.dto';
import { User, UserRole } from '../users/user.entity';
import { ActivityLogService } from '../activity-log/activity-log.service';

@Injectable()
export class HivesService {
  constructor(
    @InjectRepository(Hive)
    private readonly hiveRepository: Repository<Hive>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly activityLog: ActivityLogService,
  ) {}

  private normalizeNullableString(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : null;
  }

  private async loadMembers(memberIds?: string[]) {
    if (!memberIds?.length) {
      return [];
    }

    const uniqueIds = Array.from(new Set(memberIds));
    return this.userRepository.find({ where: { id: In(uniqueIds) } });
  }

  private async ensureAccess(hive: Hive, userId: string, role: UserRole) {
    if (role === UserRole.USER) {
      const isOwner = hive.ownerUserId === userId;
      const isMember = hive.members?.some((member) => member.id === userId) ?? false;

      if (!isOwner && !isMember) {
        throw new ForbiddenException('Access denied');
      }
    }
  }

  private buildListQuery(userId: string, role: UserRole, status?: HiveStatus) {
    const qb = this.hiveRepository
      .createQueryBuilder('hive')
      .leftJoinAndSelect('hive.members', 'member')
      .distinct(true);

    if (role === UserRole.USER) {
      qb.andWhere('(hive.ownerUserId = :userId OR member.id = :userId)', { userId });
    }

    if (status) {
      qb.andWhere('hive.status = :status', { status });
    }

    return qb;
  }

  async create(dto: CreateHiveDto, userId: string, role: UserRole) {
    if (role === UserRole.USER) {
      throw new ForbiddenException('Requires manager or admin role');
    }
    const ownerUserId =
      role === UserRole.ADMIN || role === UserRole.MANAGER
        ? dto.ownerUserId ?? userId
        : userId;
    const members = await this.loadMembers(dto.members);

    const hive = this.hiveRepository.create({
      label: dto.label.trim(),
      location: this.normalizeNullableString(dto.location),
      queenYear: dto.queenYear ?? null,
      status: dto.status ?? HiveStatus.ACTIVE,
      ownerUserId,
      members,
    });

    const saved = await this.hiveRepository.save(hive);
    await this.activityLog.log('hive_created', userId, 'hive', saved.id);

    return this.hiveRepository.findOne({
      where: { id: saved.id },
      relations: { members: true },
    });
  }

  async findAll(userId: string, role: UserRole, status?: HiveStatus) {
    const qb = this.buildListQuery(userId, role, status);
    return qb.getMany();
  }

  async findOne(id: string, userId: string, role: UserRole) {
    const hive = await this.hiveRepository.findOne({
      where: { id },
      relations: { members: true },
    });

    if (!hive) {
      throw new NotFoundException('Hive not found');
    }

    await this.ensureAccess(hive, userId, role);

    return hive;
  }

  async update(id: string, dto: UpdateHiveDto, userId: string, role: UserRole) {
    const hive = await this.findOne(id, userId, role);

    if (dto.ownerUserId && role !== UserRole.USER) {
      hive.ownerUserId = dto.ownerUserId;
    }

    if (dto.members !== undefined) {
      hive.members = await this.loadMembers(dto.members);
    }

    if (dto.label !== undefined) {
      hive.label = dto.label.trim();
    }

    if (dto.location !== undefined) {
      hive.location = this.normalizeNullableString(dto.location);
    }

    if (dto.queenYear !== undefined) {
      hive.queenYear = dto.queenYear ?? null;
    }

    if (dto.status !== undefined) {
      hive.status = dto.status;
    }

    const saved = await this.hiveRepository.save(hive);
    await this.activityLog.log('hive_updated', userId, 'hive', id);

    return this.hiveRepository.findOne({
      where: { id: saved.id },
      relations: { members: true },
    });
  }

  async remove(id: string, userId: string, role: UserRole) {
    if (role === UserRole.USER) {
      throw new ForbiddenException('Requires manager or admin role');
    }
    const hive = await this.findOne(id, userId, role);
    await this.hiveRepository.softDelete(id);
    await this.activityLog.log('hive_deleted', userId, 'hive', id);
    return { success: true };
  }
}
