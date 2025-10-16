import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { Tag } from './tag.entity';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { translateDatabaseError } from '../../common/errors/database-error.util';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagsRepository: Repository<Tag>,
  ) {}

  private normalizeName(name: string | undefined) {
    const trimmed = name?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : null;
  }

  private handleDatabaseError(error: unknown, message: string): never {
    if (error instanceof QueryFailedError) {
      const driverError = (error as QueryFailedError & { driverError?: { code?: string } })
        .driverError;
      if (driverError?.code === '23505') {
        throw new BadRequestException({
          message,
          details: 'Žymės pavadinimas turi būti unikalus',
        });
      }
    }

    translateDatabaseError(error, { message });
    throw error as any;
  }

  async findAll() {
    return this.tagsRepository.find({ order: { name: 'ASC' } });
  }

  async create(dto: CreateTagDto) {
    const normalizedName = this.normalizeName(dto.name);

    if (!normalizedName) {
      throw new BadRequestException({
        message: 'Nepavyko sukurti žymės',
        details: 'Žymės pavadinimas privalomas',
      });
    }

    const tag = this.tagsRepository.create({ name: normalizedName });

    try {
      return await this.tagsRepository.save(tag);
    } catch (error) {
      this.handleDatabaseError(error, 'Nepavyko sukurti žymės');
    }
  }

  async update(id: string, dto: UpdateTagDto) {
    const tag = await this.tagsRepository.findOne({ where: { id } });

    if (!tag) {
      throw new NotFoundException('Žymė nerasta');
    }

    if (dto.name !== undefined) {
      const normalizedName = this.normalizeName(dto.name);
      if (!normalizedName) {
        throw new BadRequestException({
          message: 'Nepavyko atnaujinti žymės',
          details: 'Žymės pavadinimas privalomas',
        });
      }
      tag.name = normalizedName;
    }

    try {
      return await this.tagsRepository.save(tag);
    } catch (error) {
      this.handleDatabaseError(error, 'Nepavyko atnaujinti žymės');
    }
  }

  async remove(id: string) {
    const tag = await this.tagsRepository.findOne({ where: { id } });

    if (!tag) {
      throw new NotFoundException('Žymė nerasta');
    }

    await this.tagsRepository.remove(tag);
  }
}
