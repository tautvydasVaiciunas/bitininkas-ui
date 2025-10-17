import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

@Injectable()
export class PaginationService {
  private readonly logger = new Logger(PaginationService.name);
  private readonly defaultPage: number;
  private readonly defaultLimit: number;
  private readonly maxLimit: number;

  constructor(private readonly configService: ConfigService) {
    this.defaultPage = this.normalizeNumber(configService.get('DEFAULT_PAGE'), 1);
    this.defaultLimit = this.normalizeNumber(configService.get('DEFAULT_LIMIT'), 20);
    this.maxLimit = this.normalizeNumber(configService.get('MAX_LIMIT'), 100);
  }

  getPagination(options: PaginationOptions): { page: number; limit: number } {
    const page = this.normalizePage(options.page);
    const limit = this.normalizeLimit(options.limit);

    return { page, limit };
  }

  buildResponse<T>(data: T[], page: number, limit: number, total: number): PaginatedResult<T> {
    return {
      data,
      page,
      limit,
      total,
    };
  }

  private normalizePage(input?: number) {
    const value = this.normalizeNumber(input, this.defaultPage);
    if (value < 1) {
      this.logger.warn(`Gautas netinkamas puslapio numeris (${input}). Naudojamas ${this.defaultPage}.`);
      return this.defaultPage;
    }

    return value;
  }

  private normalizeLimit(input?: number) {
    const value = this.normalizeNumber(input, this.defaultLimit);

    if (value < 1) {
      this.logger.warn(`Gautas netinkamas limitas (${input}). Naudojamas ${this.defaultLimit}.`);
      return this.defaultLimit;
    }

    if (value > this.maxLimit) {
      return this.maxLimit;
    }

    return value;
  }

  private normalizeNumber(input: unknown, fallback: number) {
    const parsed = Number(input);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    return Math.floor(parsed);
  }
}
