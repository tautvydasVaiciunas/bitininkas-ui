import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { StoreProduct } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import {
  PaginationService,
  PaginatedResult,
} from '../common/pagination/pagination.service';
import { runWithDatabaseErrorHandling } from '../common/errors/database-error.util';

export interface StoreProductResponse {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  description: string;
  priceCents: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class StoreProductsService {
  constructor(
    @InjectRepository(StoreProduct)
    private readonly productsRepository: Repository<StoreProduct>,
    private readonly pagination: PaginationService,
  ) {}

  private mapProduct(product: StoreProduct): StoreProductResponse {
    return {
      id: product.id,
      slug: product.slug,
      title: product.title,
      shortDescription: product.shortDescription ?? null,
      description: product.description,
      priceCents: product.priceCents,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  async listPublic(): Promise<StoreProductResponse[]> {
    const products = await this.productsRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });

    return products.map((product) => this.mapProduct(product));
  }

  async findPublicBySlug(slug: string): Promise<StoreProductResponse> {
    const product = await this.productsRepository.findOne({
      where: { slug, isActive: true },
    });

    if (!product) {
      throw new NotFoundException('Produktas nerastas');
    }

    return this.mapProduct(product);
  }

  async listForAdmin(
    query: ListProductsQueryDto,
  ): Promise<PaginatedResult<StoreProductResponse>> {
    const { page, limit } = this.pagination.getPagination(query);
    const qb = this.productsRepository.createQueryBuilder('product');

    if (query.q) {
      qb.andWhere(
        '(product.title ILIKE :search OR product.slug ILIKE :search OR product.shortDescription ILIKE :search)',
        { search: `%${query.q.trim()}%` },
      );
    }

    if (typeof query.isActive === 'boolean') {
      qb.andWhere('product.isActive = :isActive', { isActive: query.isActive });
    }

    qb.orderBy('product.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    const data = items.map((product) => this.mapProduct(product));

    return this.pagination.buildResponse(data, page, limit, total);
  }

  private readonly MAX_SLUG_LENGTH = 140;

  private slugify(input: string): string {
    const normalized = input
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-')
      .slice(0, this.MAX_SLUG_LENGTH);

    return normalized.length ? normalized : 'produktas';
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    const baseSlug = this.slugify(title);
    let candidate = baseSlug;
    let attempt = 1;

    while (
      await this.productsRepository.exist({
        where: { slug: candidate },
      })
    ) {
      const suffix = `-${attempt++}`;
      if (attempt > 100) {
        throw new BadRequestException('Nepavyko sugeneruoti produkto identifikatoriaus');
      }

      const trimmedBase = baseSlug.slice(
        0,
        Math.max(1, this.MAX_SLUG_LENGTH - suffix.length),
      );
      candidate = `${trimmedBase}${suffix}`;
    }

    return candidate;
  }

  private priceToCents(price: number): number {
    const cents = Math.round(price * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      throw new BadRequestException('Kaina turi būti teigiama');
    }
    return cents;
  }

  async create(dto: CreateProductDto): Promise<StoreProductResponse> {
    const title = dto.title.trim();
    const description = dto.description.trim();
    const shortDescription = dto.shortDescription?.trim();

    if (!title.length || !description.length) {
      throw new BadRequestException('Pateikti duomenys neteisingi');
    }

    const priceCents = this.priceToCents(dto.price);
    const slug = await this.generateUniqueSlug(title);

    const product = this.productsRepository.create({
      slug,
      title,
      shortDescription: shortDescription?.length ? shortDescription : null,
      description,
      priceCents,
      isActive: dto.isActive ?? true,
    });

    const saved = await runWithDatabaseErrorHandling(
      () => this.productsRepository.save(product),
      { message: 'Nepavyko sukurti produkto' },
    );

    return this.mapProduct(saved);
  }

  async update(id: string, dto: UpdateProductDto): Promise<StoreProductResponse> {
    const product = await this.productsRepository.findOne({ where: { id } });

    if (!product) {
      throw new NotFoundException('Produktas nerastas');
    }

    if (dto.slug !== undefined) {
      const slug = dto.slug.trim().toLowerCase();
      if (slug !== product.slug) {
        const existing = await this.productsRepository.findOne({ where: { slug } });
        if (existing) {
          throw new BadRequestException('Toks produkto slug jau naudojamas');
        }
        product.slug = slug;
      }
    }

    if (dto.title !== undefined) {
      product.title = dto.title.trim();
    }

    if (dto.shortDescription !== undefined) {
      const shortDescription = dto.shortDescription?.trim();
      product.shortDescription = shortDescription?.length ? shortDescription : null;
    }

    if (dto.description !== undefined) {
      product.description = dto.description.trim();
    }

    if (dto.price !== undefined) {
      product.priceCents = this.priceToCents(dto.price);
    } else if (dto.priceCents !== undefined) {
      if (dto.priceCents <= 0) {
        throw new BadRequestException('Kaina turi būti teigiama');
      }
      product.priceCents = dto.priceCents;
    }

    if (dto.isActive !== undefined) {
      product.isActive = dto.isActive;
    }

    const saved = await runWithDatabaseErrorHandling(
      () => this.productsRepository.save(product),
      { message: 'Nepavyko atnaujinti produkto' },
    );

    return this.mapProduct(saved);
  }

  async deactivate(id: string): Promise<{ success: boolean }> {
    const product = await this.productsRepository.findOne({ where: { id } });

    if (!product) {
      throw new NotFoundException('Produktas nerastas');
    }

    product.isActive = false;
    await this.productsRepository.save(product);

    return { success: true };
  }

  async findByIds(ids: string[]): Promise<StoreProduct[]> {
    if (!ids.length) {
      return [];
    }

    const uniqueIds = Array.from(new Set(ids));
    return this.productsRepository.find({
      where: { id: In(uniqueIds) },
    });
  }
}
