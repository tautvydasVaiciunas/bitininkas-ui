import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { ActivityLogService } from '../activity-log/activity-log.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly activityLog: ActivityLogService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const existing = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
      withDeleted: true,
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 10);
    const user = this.usersRepository.create({
      ...createUserDto,
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
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: string) {
    return this.usersRepository.findOne({ where: { id } });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.usersRepository.findOne({ where: { id }, withDeleted: true });
    if (!user) {
      throw new NotFoundException('User not found');
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
}
