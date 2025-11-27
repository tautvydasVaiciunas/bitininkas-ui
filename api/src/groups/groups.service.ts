import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
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
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import {
  PaginationService,
  PaginatedResult,
  PaginationOptions,
} from '../common/pagination/pagination.service';

@Injectable()
export class GroupsService {
  private readonly logger = new Logger(GroupsService.name);
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
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
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

    if (hiveId) {
      const existingHive = await this.membersRepository.findOne({
        where: { groupId, hiveId },
      });

      if (existingHive) {
        throw new ConflictException('Hive already assigned to group');
      }
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

    if (result?.user && result?.hive) {
      await this.notifyHiveMemberChange(result.user, result.hive, true);
    }

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
    const memberships = await this.membersRepository.find({
      where,
      relations: { user: true, hive: true },
    });

    if (!memberships.length) {
      throw new NotFoundException('Membership not found');
    }

    const hiveMembers = memberships.filter((membership) => membership.hive);
    await this.membersRepository.remove(memberships);
    for (const membership of hiveMembers) {
      if (membership.user && membership.hive) {
        await this.notifyHiveMemberChange(membership.user, membership.hive, false);
      }
    }
    return { success: true };
  }

  private async notifyHiveMemberChange(user: User | null, hive: Hive | null, added: boolean) {
    if (!user || !hive) {
      return;
    }

    const subject = added ? 'Priskirtas naujas avilys' : 'Avilys pašalintas iš jūsų paskyros';
    const text = added
      ? `Jums priskirtas avilys „${hive.label}“. Peržiūrėti: https://app.busmedaus.lt/hives/${hive.id}`
      : `Avilys „${hive.label}“ nebėra priskirtas jūsų paskyrai. Jei manote, kad tai klaida, parašykite žinutę per sistemą.`;
    const html = added
      ? `<p>Jums priskirtas avilys „${hive.label}“.</p><p><a href="https://app.busmedaus.lt/hives/${hive.id}">Peržiūrėti avilį</a></p>`
      : `<p>Avilys „${hive.label}“ nebėra priskirtas jūsų paskyrai.</p><p><a href="https://app.busmedaus.lt/support">Parašykite žinutę</a></p>`;

    if (user.email) {
      try {
        await this.emailService.sendMail({
          to: user.email,
          subject,
          text,
          html,
        });
      } catch (error) {
        this.logger.warn(
          `Nepavyko siųsti avilio pakeitimo el. laiško vartotojui ${user.email}: ${
            error instanceof Error ? error.message : String(error)
          }`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    try {
      await this.notificationsService.createNotification(user.id, {
        type: 'hive_assignment',
        title: subject,
        body: added ? `Jums priskirtas avilys ${hive.label}.` : `Avilys ${hive.label} nebėra priskirtas jūsų paskyrai.`,
        link: `/hives/${hive.id}`,
        sendEmail: false,
      });
    } catch (error) {
      this.logger.warn(
        `Nepavyko sukurti pranešimo apie avilio pakeitimą vartotojui ${user.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
