import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import { User, UserRole } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { UpdatePasswordDto } from './dto/update-password.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly activityLog: ActivityLogService,
  ) {}

  private normalizeNullableString(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : null;
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

    const passwordHash = await bcrypt.hash(createUserDto.password, 10);
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
    return saved;
  }

  async findAll() {
    return this.usersRepository.find({ withDeleted: true });
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
      user.name = this.normalizeNullableString(updates.name);
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
