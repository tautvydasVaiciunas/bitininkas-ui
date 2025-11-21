import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, EntityManager, In, Repository } from 'typeorm';
import { Hive, HiveStatus } from './hive.entity';
import { CreateHiveDto } from './dto/create-hive.dto';
import { UpdateHiveDto } from './dto/update-hive.dto';
import { User, UserRole } from '../users/user.entity';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { runWithDatabaseErrorHandling } from '../common/errors/database-error.util';
import { HiveTag } from './tags/hive-tag.entity';
import { HiveEventsService } from './hive-events.service';

@Injectable()
export class HivesService {
  private readonly logger = new Logger(HivesService.name);

  constructor(
    @InjectRepository(Hive)
    private readonly hiveRepository: Repository<Hive>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(HiveTag)
    private readonly hiveTagRepository: Repository<HiveTag>,
    private readonly activityLog: ActivityLogService,
    private readonly hiveEvents: HiveEventsService,
  ) {}

  private normalizeNullableString(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : null;
  }

  private async normalizeTagId(tagId?: string | null) {
    if (!tagId) {
      return null;
    }

    const tag = await this.hiveTagRepository.findOne({
      where: { id: tagId },
      select: { id: true },
    });

    if (!tag) {
      throw new BadRequestException({
        message: 'Neteisingi duomenys',
        details: 'Žyma nerasta',
      });
    }

    return tag.id;
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

  private async validateMemberIds(memberIds: string[]) {
    if (!memberIds.length) {
      return [];
    }

    const uniqueIds = Array.from(new Set(memberIds));
    const foundCount = await this.userRepository.count({ where: { id: In(uniqueIds) } });

    if (foundCount !== uniqueIds.length) {
      throw new BadRequestException({
        message: 'Neteisingi duomenys',
        details: 'Kai kurie priskirti naudotojai nerasti',
      });
    }

    return uniqueIds;
  }

  private async replaceMembers(manager: EntityManager, hiveId: string, memberIds: string[]) {
    await manager
      .createQueryBuilder()
      .delete()
      .from('hive_members')
      .where('hive_id = :hiveId', { hiveId })
      .execute();

    if (!memberIds.length) {
      return;
    }

    await manager
      .createQueryBuilder()
      .insert()
      .into('hive_members')
      .values(memberIds.map((userId) => ({ hive_id: hiveId, user_id: userId })))
      .orIgnore()
      .execute();
  }

  private async getHiveWithRelations(id: string): Promise<Hive | null> {
    return this.hiveRepository.findOne({
      where: { id },
      relations: { members: true, owner: true, tag: true },
    });
  }

  private buildListQuery(userId: string, role: UserRole, status?: HiveStatus) {
    const qb = this.hiveRepository
      .createQueryBuilder('hive')
      .leftJoinAndSelect('hive.members', 'member')
      .leftJoinAndSelect('hive.owner', 'owner')
      .leftJoinAndSelect('hive.tag', 'tag')
      .leftJoin('hive_members', 'hm', 'hm.hive_id = hive.id')
      .where('hive.deletedAt IS NULL')
      .distinct(true);

    if (role === UserRole.USER) {
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
    const normalizedTagId = await this.normalizeTagId(dto.tagId ?? null);

    const ownerUserId =
      role === UserRole.ADMIN || role === UserRole.MANAGER
        ? dto.ownerUserId ?? normalizedUserIds[0] ?? userId
        : userId;

    const memberIds = await this.validateMemberIds(
      normalizedUserIds.filter((id) => id !== ownerUserId),
    );

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
            queenYear: null,
            status: dto.status ?? HiveStatus.ACTIVE,
            ownerUserId,
            members: [],
            tagId: normalizedTagId,
          });

          const savedHive = await hiveRepo.save(hive);
          await this.replaceMembers(manager, savedHive.id, memberIds);
          return savedHive;
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

  async findForUser(userId: string, includeArchived = false) {
    const qb = this.hiveRepository
      .createQueryBuilder('hive')
      .leftJoin('hive.members', 'member')
      .leftJoinAndSelect('hive.tag', 'tag')
      .where(
        new Brackets((where) =>
          where
            .where('hive.ownerUserId = :userId', { userId })
            .orWhere('member.id = :userId', { userId }),
        ),
      )
      .orderBy('hive.label', 'ASC')
      .distinct(true);

    if (!includeArchived) {
      qb.andWhere('hive.status != :archived', { archived: HiveStatus.ARCHIVED });
    }

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
    const result = await runWithDatabaseErrorHandling(
      () =>
        this.hiveRepository.manager.transaction(async (manager) => {
          const hiveRepo = manager.getRepository(Hive);
          const hive = await hiveRepo.findOne({
            where: { id },
            relations: { members: true, owner: true, tag: true },
          });

          if (!hive) {
            throw new NotFoundException('Avilys nerastas');
          }

          await this.ensureAccess(hive, userId, role);

          const originalSnapshot = {
            label: hive.label,
            location: hive.location ?? null,
            tagName: hive.tag?.name ?? null,
          };

          if (dto.ownerUserId && role !== UserRole.USER) {
            hive.ownerUserId = dto.ownerUserId;
          }

          if (dto.label !== undefined) {
            hive.label = dto.label.trim();
          }

          if (dto.location !== undefined) {
            hive.location = this.normalizeNullableString(dto.location);
          }

          if (dto.status !== undefined) {
            hive.status = dto.status;
          }

          if (dto.tagId !== undefined) {
            hive.tagId = dto.tagId ? await this.normalizeTagId(dto.tagId) : null;
          }

          let memberIds: string[] | null = null;

          if (dto.members !== undefined || dto.userIds !== undefined) {
            const normalized = this.normalizeUserIds(dto.userIds ?? dto.members ?? []);
            memberIds = await this.validateMemberIds(
              normalized.filter((memberId) => memberId !== hive.ownerUserId),
            );
          }

          const saved = await hiveRepo.save(hive);

          if (memberIds !== null) {
            await this.replaceMembers(manager, saved.id, memberIds);
          }

          const updated = await hiveRepo.findOne({
            where: { id: saved.id },
            relations: { members: true, owner: true, tag: true },
          });

          if (!updated) {
            throw new NotFoundException('Avilys nerastas');
          }

          const changedFields = this.buildChangedFields(originalSnapshot, updated);

          return { updated, changedFields };
        }),
      { message: 'Neteisingi duomenys' },
    );

    await this.activityLog.log('hive_updated', userId, 'hive', id);

    if (Object.keys(result.changedFields).length) {
      await this.hiveEvents.logHiveUpdated(result.updated.id, result.changedFields, userId);
    }

    return result.updated;
  }

  async findMembers(id: string, userId: string, role: UserRole) {
    const hive = await this.findOne(id, userId, role);
    return hive.members ?? [];
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

  private buildChangedFields(
    original: { label: string; location: string | null; tagName: string | null },
    updated: Hive,
  ) {
    const changed: Record<string, { before: string | null; after: string | null }> = {};
    const updatedTagName = updated.tag?.name ?? null;

    if (original.label !== updated.label) {
      changed.label = { before: original.label, after: updated.label };
    }

    if ((original.location ?? null) !== (updated.location ?? null)) {
      changed.location = { before: original.location, after: updated.location ?? null };
    }

    if ((original.tagName ?? null) !== updatedTagName) {
      changed.tag = { before: original.tagName, after: updatedTagName };
    }

    return changed;
  }
}
