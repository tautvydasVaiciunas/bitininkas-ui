import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Hive, HiveStatus } from './hive.entity';
import { CreateHiveDto } from './dto/create-hive.dto';
import { UpdateHiveDto } from './dto/update-hive.dto';
import { User, UserRole } from '../users/user.entity';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { runWithDatabaseErrorHandling } from '../common/errors/database-error.util';

@Injectable()
export class HivesService {
  private readonly logger = new Logger(HivesService.name);

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
    return this.userRepository.findBy({ id: In(uniqueIds) });
  }

  private async ensureAccess(hive: Hive, userId: string, role: UserRole) {
    if (role === UserRole.USER) {
      const isOwner = hive.ownerUserId === userId;
      const isMember = hive.members?.some((member) => member.id === userId) ?? false;

      if (!isOwner && !isMember) {
        throw new ForbiddenException('Prieiga uždrausta');
      }
    }
  }

  private normalizeUserIds(values?: string[]) {
    if (!Array.isArray(values)) {
      return [];
    }

    return Array.from(
      new Set(values.filter((value) => typeof value === 'string' && value.trim().length > 0)),
    );
  }

  private async getHiveWithRelations(id: string): Promise<Hive | null> {
    return this.hiveRepository.findOne({
      where: { id },
      relations: { members: true, owner: true },
    });
  }

  private buildListQuery(userId: string, role: UserRole, status?: HiveStatus) {
    const qb = this.hiveRepository
      .createQueryBuilder('hive')
      .leftJoinAndSelect('hive.members', 'member')
      .leftJoinAndSelect('hive.owner', 'owner')
      .leftJoin('hive_members', 'hm', 'hm.hive_id = hive.id')
      .where('hive.deletedAt IS NULL')
      .distinct(true);

    if (role !== UserRole.ADMIN) {
      qb.andWhere('(hive.ownerUserId = :userId OR hm.user_id = :userId)', { userId });
    }

    if (status) {
      qb.andWhere('hive.status = :status', { status });
    }

    qb.orderBy('hive.createdAt', 'DESC');

    return qb;
  }

  async create(dto: CreateHiveDto, userId: string, role: UserRole): Promise<Hive> {
    if (role === UserRole.USER) {
      throw new ForbiddenException('Reikia vadybininko arba administratoriaus rolės');
    }

    const label = dto.label?.trim();
    if (!label) {
      this.logger.warn('Nepavyko sukurti avilio: pavadinimas privalomas');
      throw new BadRequestException({
        message: 'Neteisingi duomenys',
        details: 'Pavadinimas privalomas',
      });
    }

    const normalizedUserIds = this.normalizeUserIds(dto.userIds ?? dto.members);

    const ownerUserId =
      role === UserRole.ADMIN || role === UserRole.MANAGER
        ? dto.ownerUserId ?? normalizedUserIds[0] ?? userId
        : userId;

    const memberIds = normalizedUserIds.filter((id) => id !== ownerUserId);

    const saved = await runWithDatabaseErrorHandling(
      () =>
        this.hiveRepository.manager.transaction(async (manager) => {
          const hiveRepo = manager.getRepository(Hive);
          const userRepo = manager.getRepository(User);

          const owner = await userRepo.findOne({ where: { id: ownerUserId } });
          if (!owner) {
            throw new BadRequestException({
              message: 'Neteisingi duomenys',
              details: 'Savininkas nerastas',
            });
          }

          const hive = hiveRepo.create({
            label,
            location: this.normalizeNullableString(dto.location),
            queenYear: dto.queenYear ?? null,
            status: dto.status ?? HiveStatus.ACTIVE,
            ownerUserId,
            members: [],
          });

          if (memberIds.length) {
            const members = await userRepo.findBy({ id: In(memberIds) });

            if (members.length !== memberIds.length) {
              throw new BadRequestException({
                message: 'Neteisingi duomenys',
                details: 'Kai kurie priskirti naudotojai nerasti',
              });
            }

            hive.members = members;
          }

          return hiveRepo.save(hive);
        }),
      { message: 'Neteisingi duomenys' },
    );

    await this.activityLog.log('hive_created', userId, 'hive', saved.id);

    const hiveWithRelations = await this.getHiveWithRelations(saved.id);

    if (!hiveWithRelations) {
      throw new NotFoundException('Avilys nerastas');
    }

    return hiveWithRelations;
  }

  async findAll(userId: string, role: UserRole, status?: HiveStatus) {
    const qb = this.buildListQuery(userId, role, status);
    return runWithDatabaseErrorHandling(() => qb.getMany(), {
      message: 'Neteisingi duomenys',
    });
  }

  async findOne(id: string, userId: string, role: UserRole): Promise<Hive> {
    const hive = await this.getHiveWithRelations(id);

    if (!hive) {
      throw new NotFoundException('Avilys nerastas');
    }

    await this.ensureAccess(hive, userId, role);

    return hive;
  }

  async update(id: string, dto: UpdateHiveDto, userId: string, role: UserRole): Promise<Hive> {
    const hive = await this.findOne(id, userId, role);

    if (dto.ownerUserId && role !== UserRole.USER) {
      hive.ownerUserId = dto.ownerUserId;
    }

    if (dto.members !== undefined || dto.userIds !== undefined) {
      const normalized = this.normalizeUserIds(dto.userIds ?? dto.members ?? []);
      hive.members = await this.loadMembers(normalized.filter((id) => id !== hive.ownerUserId));
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

    const saved = await runWithDatabaseErrorHandling(
      () => this.hiveRepository.save(hive),
      { message: 'Neteisingi duomenys' },
    );
    await this.activityLog.log('hive_updated', userId, 'hive', id);

    const updatedHive = await this.getHiveWithRelations(saved.id);

    if (!updatedHive) {
      throw new NotFoundException('Avilys nerastas');
    }

    return updatedHive;
  }

  async remove(id: string, userId: string, role: UserRole) {
    if (role === UserRole.USER) {
      throw new ForbiddenException('Reikia vadybininko arba administratoriaus rolės');
    }
    const hive = await this.findOne(id, userId, role);
    await this.hiveRepository.softDelete(id);
    await this.activityLog.log('hive_deleted', userId, 'hive', id);
    return { success: true };
  }
}
