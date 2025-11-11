import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';

import { User, UserRole } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { ActivityLogService } from '../activity-log/activity-log.service';
import {
  PaginationService,
  PaginatedResult,
  PaginationOptions,
} from '../common/pagination/pagination.service';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { PasswordResetService } from '../auth/password-reset.service';
import { resolveUploadsDir, uploadsPrefix } from '../common/config/storage.config';

type UserGroupDto = {
  id: string;
  name: string;
};

type UserWithGroups = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  phone: string | null;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  groups: UserGroupDto[];
};

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private static readonly AVATAR_SUBDIR = 'avatars';

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly activityLog: ActivityLogService,
    private readonly pagination: PaginationService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  private normalizeNullableString(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : null;
  }

  private normalizeProfileName(value?: string | null) {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.replace(/\s+/g, ' ').trim();
    return normalized.length > 0 ? normalized : null;
  }

  private async removeStoredAvatarIfLocal(avatarUrl?: string | null) {
    if (!avatarUrl) {
      return;
    }

    const prefix = `${uploadsPrefix()}/${UsersService.AVATAR_SUBDIR}/`;
    if (!avatarUrl.startsWith(prefix)) {
      return;
    }

    const filename = avatarUrl.slice(prefix.length);
    if (!filename) {
      return;
    }

    const filePath = path.join(resolveUploadsDir(), UsersService.AVATAR_SUBDIR, filename);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.debug(
          `Nepavyko pašalinti seno avataro failo ${filename}: ${(error as Error).message}`,
        );
      }
    }
  }

  async create(createUserDto: CreateUserDto) {
    const email = createUserDto.email.trim().toLowerCase();

    const existing = await this.usersRepository.findOne({
      where: { email },
      withDeleted: true,
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const rawPassword =
      typeof createUserDto.password === 'string' ? createUserDto.password : '';
    const trimmedPassword = rawPassword.trim();
    const hasPassword = trimmedPassword.length >= 6;
    const plainPassword = hasPassword ? trimmedPassword : randomBytes(12).toString('hex');
    const passwordHash = await bcrypt.hash(plainPassword, 10);
    const user = this.usersRepository.create({
      email,
      passwordHash,
      role: createUserDto.role || UserRole.USER,
      name: this.normalizeNullableString(createUserDto.name),
      phone: this.normalizeNullableString(createUserDto.phone),
      address: this.normalizeNullableString(createUserDto.address),
    });

    const saved = await this.usersRepository.save(user);
    await this.activityLog.log('user_created', saved.id, 'user', saved.id);

    if (!hasPassword) {
      try {
        await this.passwordResetService.createTokenForUser(saved, {
          template: 'invite',
          enforceCooldown: false,
        });
      } catch (error) {
        this.logger.warn(
          `Nepavyko siųsti kvietimo vartotojui ${saved.email}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return saved;
  }

  private mapUserGroups(user: User): UserGroupDto[] {
    if (!user.groupMemberships?.length) {
      return [];
    }

    return user.groupMemberships
      .map((membership) => membership.group)
      .filter((group): group is NonNullable<typeof group> => Boolean(group))
      .map((group) => ({
        id: group.id,
        name: group.name,
      }));
  }

  private toUserWithGroups(user: User): UserWithGroups {
    return {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      role: user.role,
      phone: user.phone ?? null,
      address: user.address ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt,
      groups: this.mapUserGroups(user),
    };
  }

  async findAll(
    options: PaginationOptions & { q?: string } = {},
  ): Promise<PaginatedResult<UserWithGroups>> {
    const { page, limit } = this.pagination.getPagination({
      page: options.page,
      limit: options.limit,
    });

    const normalizedQuery = options.q?.trim().toLowerCase();
    const qb = this.usersRepository
      .createQueryBuilder('user')
      .withDeleted()
      .leftJoinAndSelect('user.groupMemberships', 'membership')
      .leftJoinAndSelect('membership.group', 'group')
      .orderBy('user.createdAt', 'DESC')
      .take(limit)
      .skip((page - 1) * limit);

    if (normalizedQuery) {
      const escaped = normalizedQuery.replace(/[%_]/g, '\\$&');
      const search = `%${escaped}%`;
      qb.andWhere(
        `(LOWER(user.email) LIKE :search ESCAPE '\\' OR LOWER(user.name) LIKE :search ESCAPE '\\')`,
        { search },
      );
    }

    const [users, total] = await qb.getManyAndCount();
    const mapped = users.map((user) => this.toUserWithGroups(user));
    return this.pagination.buildResponse(mapped, page, limit, total);
  }

  async findByEmail(email: string) {
    const normalized = email.trim().toLowerCase();
    return this.usersRepository.findOne({ where: { email: normalized } });
  }

  async findById(id: string) {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByIdOrFail(id: string) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    actor: { id: string; role: UserRole },
  ) {
    const user = await this.usersRepository.findOne({ where: { id }, withDeleted: true });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const email = updateUserDto.email.trim().toLowerCase();
      const existing = await this.usersRepository.findOne({
        where: { email },
        withDeleted: true,
      });

      if (existing && existing.id !== id) {
        throw new ConflictException('Email already registered');
      }

      user.email = email;
    }

    if (updateUserDto.deleted !== undefined) {
      if (updateUserDto.deleted) {
        await this.usersRepository.softDelete(id);
      } else if (user.deletedAt) {
        await this.usersRepository.restore(id);
      }
    }

    if (updateUserDto.password) {
      user.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
    }

    if (updateUserDto.name !== undefined) {
      user.name = this.normalizeNullableString(updateUserDto.name);
    }

    if (updateUserDto.phone !== undefined) {
      user.phone = this.normalizeNullableString(updateUserDto.phone);
    }

    if (updateUserDto.address !== undefined) {
      user.address = this.normalizeNullableString(updateUserDto.address);
    }

    const saved = await this.usersRepository.save(user);
    await this.activityLog.log('user_updated', actor.id, 'user', saved.id);
    return saved;
  }

  async updateRole(
    id: string,
    updateUserRoleDto: UpdateUserRoleDto,
    actor: { id: string; role: UserRole },
  ) {
    const user = await this.usersRepository.findOne({ where: { id }, withDeleted: true });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.role = updateUserRoleDto.role;

    const saved = await this.usersRepository.save(user);
    await this.activityLog.log('user_role_updated', actor.id, 'user', saved.id);
    return saved;
  }

  async remove(id: string, actor: { id: string; role: UserRole }) {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.usersRepository.softDelete(id);
    await this.activityLog.log('user_deleted', actor.id, 'user', id);
    return { success: true };
  }

  async updateProfile(id: string, updates: UpdateProfileDto) {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updates.email && updates.email !== user.email) {
      const email = updates.email.trim().toLowerCase();
      const existing = await this.usersRepository.findOne({
        where: { email },
        withDeleted: true,
      });

      if (existing && existing.id !== id) {
        throw new ConflictException('Email already registered');
      }

      user.email = email;
    }

    if (updates.name !== undefined) {
      user.name = this.normalizeProfileName(updates.name);
    }

    if (updates.phone !== undefined) {
      user.phone = this.normalizeNullableString(updates.phone);
    }

    if (updates.address !== undefined) {
      user.address = this.normalizeNullableString(updates.address);
    }

    const saved = await this.usersRepository.save(user);
    await this.activityLog.log('profile_updated', saved.id, 'user', saved.id);
    return saved;
  }

  async setAvatar(id: string, avatarUrl: string) {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('Vartotojas nerastas');
    }

    await this.removeStoredAvatarIfLocal(user.avatarUrl);
    user.avatarUrl = avatarUrl;
    await this.usersRepository.save(user);
    await this.activityLog.log('avatar_updated', user.id, 'user', user.id);

    return { avatarUrl };
  }

  async updatePassword(id: string, { oldPassword, newPassword }: UpdatePasswordDto) {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const matches = await bcrypt.compare(oldPassword, user.passwordHash);

    if (!matches) {
      throw new BadRequestException('Neteisingas dabartinis slaptažodis');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersRepository.save(user);
    await this.activityLog.log('password_changed', user.id, 'user', user.id);

    return { success: true };
  }
}
