import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { Group } from './group.entity';
import { GroupMember } from './group-member.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AddGroupMemberDto } from './dto/add-group-member.dto';
import { User, UserRole } from '../users/user.entity';
import { Hive } from '../hives/hive.entity';
import {
  PaginationService,
  PaginatedResult,
  PaginationOptions,
} from '../common/pagination/pagination.service';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private readonly groupsRepository: Repository<Group>,
    @InjectRepository(GroupMember)
    private readonly membersRepository: Repository<GroupMember>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  @InjectRepository(Hive)
  private readonly hivesRepository: Repository<Hive>,
    private readonly pagination: PaginationService,
  ) {}

  private ensureManager(role: UserRole) {
    if (![UserRole.MANAGER, UserRole.ADMIN].includes(role)) {
      throw new ForbiddenException('Requires manager or admin role');
    }
  }

  private sanitizeName(name: string) {
    return name.trim();
  }

  async findAll(options: PaginationOptions = {}): Promise<PaginatedResult<Group>> {
    const { page, limit } = this.pagination.getPagination(options);

    const [groups, total] = await this.groupsRepository.findAndCount({
      order: { name: 'ASC' },
      relations: {
        members: { user: true, hive: true },
      },
      take: limit,
      skip: (page - 1) * limit,
    });

    return this.pagination.buildResponse(groups, page, limit, total);
  }

  async findOne(id: string) {
    const group = await this.groupsRepository.findOne({
      where: { id },
      relations: {
        members: { user: true, hive: true },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return group;
  }

  async create(dto: CreateGroupDto, actor: { role: UserRole }) {
    this.ensureManager(actor.role);

    const name = this.sanitizeName(dto.name);

    const existing = await this.groupsRepository.findOne({ where: { name } });
    if (existing) {
      throw new ConflictException('Group with this name already exists');
    }

    const group = this.groupsRepository.create({
      name,
      description: dto.description?.trim() || null,
    });

    return this.groupsRepository.save(group);
  }

  async update(id: string, dto: UpdateGroupDto, actor: { role: UserRole }) {
    this.ensureManager(actor.role);

    const group = await this.groupsRepository.findOne({ where: { id } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    if (dto.name) {
      const name = this.sanitizeName(dto.name);
      if (name !== group.name) {
        const existing = await this.groupsRepository.findOne({ where: { name } });
        if (existing && existing.id !== id) {
          throw new ConflictException('Group with this name already exists');
        }
        group.name = name;
      }
    }

    if (dto.description !== undefined) {
      group.description = dto.description?.trim() || null;
    }

    return this.groupsRepository.save(group);
  }

  async remove(id: string, actor: { role: UserRole }) {
    this.ensureManager(actor.role);

    const group = await this.groupsRepository.findOne({ where: { id } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    await this.groupsRepository.remove(group);
    return { success: true };
  }

  async getMembers(
    groupId: string,
    actor: { role: UserRole },
    options: PaginationOptions = {},
  ): Promise<PaginatedResult<GroupMember>> {
    this.ensureManager(actor.role);
    const group = await this.groupsRepository.findOne({ where: { id: groupId } });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const { page, limit } = this.pagination.getPagination(options);

    const [members, total] = await this.membersRepository.findAndCount({
      where: { groupId },
      relations: { user: true, hive: true },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return this.pagination.buildResponse(members, page, limit, total);
  }

  async addMember(groupId: string, dto: AddGroupMemberDto, actor: { role: UserRole }) {
    this.ensureManager(actor.role);

    await this.findOne(groupId);

    const user = await this.usersRepository.findOne({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let hiveId: string | null = null;

    if (dto.hiveId) {
      const hive = await this.hivesRepository.findOne({
        where: { id: dto.hiveId },
        relations: { members: true },
      });

      if (!hive) {
        throw new NotFoundException('Hive not found');
      }

      const isMemberOfHive =
        hive.members?.some((member) => member.id === dto.userId) ?? false;

      if (hive.ownerUserId !== dto.userId && !isMemberOfHive) {
        throw new BadRequestException('Vartotojas nėra šio avilio savininkas');
      }

      hiveId = hive.id;
    }

    const existing = await this.membersRepository.findOne({
      where: hiveId
        ? { groupId, userId: dto.userId, hiveId }
        : { groupId, userId: dto.userId, hiveId: IsNull() },
    });

    if (existing) {
      throw new ConflictException('User is already a group member');
    }

    const member = this.membersRepository.create({
      groupId,
      userId: dto.userId,
      hiveId,
      role: dto.role?.trim() || null,
    });

    const saved = await this.membersRepository.save(member);
    const result = await this.membersRepository.findOne({
      where: { id: saved.id },
      relations: { user: true, hive: true },
    });

    return result;
  }

  async removeMember(
    groupId: string,
    userId: string,
    hiveId: string | undefined,
    actor: { role: UserRole },
  ) {
    this.ensureManager(actor.role);

    const where: FindOptionsWhere<GroupMember> = hiveId
      ? { groupId, userId, hiveId }
      : { groupId, userId };
    const memberships = await this.membersRepository.find({ where });

    if (!memberships.length) {
      throw new NotFoundException('Membership not found');
    }

    await this.membersRepository.remove(memberships);
    return { success: true };
  }
}
