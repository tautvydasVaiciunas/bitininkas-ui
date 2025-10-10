import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import { User, UserRole } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ActivityLogService } from '../activity-log/activity-log.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly activityLog: ActivityLogService,
  ) {}

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
      ...createUserDto,
      email,
      passwordHash,
      role: createUserDto.role || UserRole.USER,
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

  async update(id: string, updateUserDto: UpdateUserDto) {
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

    if (updateUserDto.role) {
      user.role = updateUserDto.role;
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

    if (updateUserDto.name !== undefined) user.name = updateUserDto.name;
    if (updateUserDto.phone !== undefined) user.phone = updateUserDto.phone;
    if (updateUserDto.address !== undefined) user.address = updateUserDto.address;

    const saved = await this.usersRepository.save(user);
    await this.activityLog.log('user_updated', saved.id, 'user', saved.id);
    return saved;
  }

  async remove(id: string) {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.usersRepository.softDelete(id);
    await this.activityLog.log('user_deleted', user.id, 'user', id);
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
      const name = updates.name?.trim();
      user.name = name && name.length > 0 ? name : null;
    }

    if (updates.phone !== undefined) {
      const phone = updates.phone?.trim();
      user.phone = phone && phone.length > 0 ? phone : null;
    }

    if (updates.address !== undefined) {
      const address = updates.address?.trim();
      user.address = address && address.length > 0 ? address : null;
    }

    const saved = await this.usersRepository.save(user);
    await this.activityLog.log('profile_updated', saved.id, 'user', saved.id);
    return saved;
  }
}
