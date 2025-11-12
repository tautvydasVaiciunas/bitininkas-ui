import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HiveTag } from './hive-tag.entity';
import { CreateHiveTagDto } from './dto/create-hive-tag.dto';
import { runWithDatabaseErrorHandling } from '../../common/errors/database-error.util';

@Injectable()
export class HiveTagsService {
  constructor(
    @InjectRepository(HiveTag)
    private readonly hiveTagRepository: Repository<HiveTag>,
  ) {}

  async findAll(): Promise<HiveTag[]> {
    return this.hiveTagRepository.find({ order: { name: 'ASC' } });
  }

  async create(dto: CreateHiveTagDto): Promise<HiveTag> {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException({
        message: 'Neteisingi duomenys',
        details: 'Zymos pavadinimas privalomas',
      });
    }

    const defaultColor = '#F9D776';
    const normalizedColor = dto.color ? dto.color.trim().toUpperCase() : defaultColor;

    const entity = this.hiveTagRepository.create({ name, color: normalizedColor });
    return runWithDatabaseErrorHandling(() => this.hiveTagRepository.save(entity), {
      message: 'Nepavyko sukurti zymos',
    });
  }
}
