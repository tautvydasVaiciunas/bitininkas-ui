import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryFailedError, Repository } from 'typeorm';
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

  private extractColumnName(detail?: string) {
    if (!detail) {
      return undefined;
    }

    const parenMatch = detail.match(/\(([^)]+)\)=/);
    if (parenMatch) {
      return parenMatch[1];
    }

    const columnMatch = detail.match(/column "([^"]+)"/i);
    if (columnMatch) {
      return columnMatch[1];
    }

    return undefined;
  }

  private getDatabaseErrorMessage(code: string | undefined, column: string | undefined, action: string) {
    if (code === '23503') {
      return `${action}: ${column ? `${column} not found` : 'related entity missing'}`;
    }

    if (code === '23505') {
      return `${action}: ${column ? `duplicate value for ${column}` : 'duplicate value'}`;
    }

    if (code === '23514') {
      return `${action}: constraint violated`;
    }

    if (code === '23502') {
      return `${action}: ${column ? `${column} is required` : 'missing required value'}`;
    }

    return `${action}: invalid data`;
  }

  private handleDatabaseError(
    error: unknown,
    action: string,
    errorMessage: string,
  ): never {
    if (error instanceof QueryFailedError) {
      const driverError =
        (error as QueryFailedError & { driverError?: Record<string, unknown> }).driverError ?? {};
      const codeValue = driverError.code;
      const detailValue = (driverError.detail ?? driverError.message) as unknown;
      const code = typeof codeValue === 'string' ? codeValue : undefined;
      const detail = typeof detailValue === 'string' ? detailValue : undefined;
      const column = this.extractColumnName(detail);
      const englishMessage = this.getDatabaseErrorMessage(code, column, action);

      console.error(englishMessage, error);
      throw new BadRequestException({ message: errorMessage, details: englishMessage });
    }

    if (error instanceof BadRequestException || error instanceof UnprocessableEntityException) {
      throw error;
    }

    throw error;
  }

  private async runWithDatabaseErrorHandling<T>(
    operation: () => Promise<T>,
    action: string,
    errorMessage = 'Neteisingi duomenys',
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.handleDatabaseError(error, action, errorMessage);
    }
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
      .where('hive.deletedAt IS NULL')
      .distinct(true);

    if (role === UserRole.USER) {
      qb.andWhere('(hive.ownerUserId = :userId OR member.id = :userId)', { userId });
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
      console.error('Nepavyko sukurti avilio: pavadinimas privalomas');
      throw new BadRequestException({
        message: 'Nepavyko sukurti avilio',
        details: 'Pavadinimas privalomas',
      });
    }

    const normalizedUserIds = this.normalizeUserIds(dto.userIds);
    const memberCandidates = this.normalizeUserIds(dto.members);
    const allCandidateIds = Array.from(new Set([...normalizedUserIds, ...memberCandidates]));

    const ownerUserId =
      role === UserRole.ADMIN || role === UserRole.MANAGER
        ? dto.ownerUserId ?? allCandidateIds[0] ?? userId
        : userId;

    const memberIds = allCandidateIds.filter((id) => id !== ownerUserId);

    const saved = await this.runWithDatabaseErrorHandling(
      () =>
        this.hiveRepository.manager.transaction(async (manager) => {
          const hiveRepo = manager.getRepository(Hive);
          const userRepo = manager.getRepository(User);

          const owner = await userRepo.findOne({ where: { id: ownerUserId } });
          if (!owner) {
            throw new BadRequestException({
              message: 'Nepavyko sukurti avilio',
              details: 'Savininkas nerastas',
            });
          }

          const members = memberIds.length
            ? await userRepo.find({ where: { id: In(memberIds) } })
            : [];

          if (members.length !== memberIds.length) {
            throw new BadRequestException({
              message: 'Nepavyko sukurti avilio',
              details: 'Kai kurie priskirti naudotojai nerasti',
            });
          }

          const hive = hiveRepo.create({
            label,
            location: this.normalizeNullableString(dto.location),
            queenYear: dto.queenYear ?? null,
            status: dto.status ?? HiveStatus.ACTIVE,
            ownerUserId,
            members,
          });

          return hiveRepo.save(hive);
        }),
      'create hive',
      'Nepavyko sukurti avilio',
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
    return qb.getMany();
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

    const saved = await this.runWithDatabaseErrorHandling(
      () => this.hiveRepository.save(hive),
      'update hive',
      'Nepavyko atnaujinti avilio',
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
