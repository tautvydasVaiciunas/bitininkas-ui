import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { In, Repository } from 'typeorm';

import { User, UserRole } from './user.entity';
import { UserServiceContract } from './user-service-contract.entity';
import { StoreOrder, StoreOrderStatus } from '../store/entities/order.entity';

export interface UserServiceContractResponse {
  signed: boolean;
  canSign: boolean;
  shouldPrompt: boolean;
  userEmail: string;
  contractNumber: string | null;
  signedAt: string | null;
  templateHash: string;
  templateVersion: string;
  content: string;
}

interface TemplateSource {
  content: string;
  hash: string;
  version: string;
}

interface ContractRenderContext {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  companyName: string;
  companyCode: string;
  vatCode: string;
  orderId: string;
  orderCreatedAt: string;
  subscriptionValidUntil: string;
}

@Injectable()
export class UserServiceContractService {
  private templateCache: TemplateSource | null = null;

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(UserServiceContract)
    private readonly contractsRepository: Repository<UserServiceContract>,
    @InjectRepository(StoreOrder)
    private readonly storeOrdersRepository: Repository<StoreOrder>,
  ) {}

  async getForUser(userId: string): Promise<UserServiceContractResponse> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Vartotojas nerastas');
    }

    const template = await this.getTemplateSource();
    const existing = await this.contractsRepository.findOne({ where: { userId } });
    if (existing) {
      return {
        signed: true,
        canSign: false,
        shouldPrompt: false,
        userEmail: user.email,
        contractNumber: existing.contractNumber,
        signedAt: existing.signedAt.toISOString(),
        templateHash: existing.templateHash,
        templateVersion: existing.templateVersion,
        content: existing.snapshotMarkdown,
      };
    }

    const context = await this.buildRenderContext(user);
    const renderedTemplate = this.applyPlaceholders(template.content, context);
    const canSign = user.role === UserRole.USER;
    const shouldPrompt = canSign && (await this.hasActiveContractRequirement(user));

    return {
      signed: false,
      canSign,
      shouldPrompt,
      userEmail: user.email,
      contractNumber: null,
      signedAt: null,
      templateHash: template.hash,
      templateVersion: template.version,
      content: this.buildSnapshotMarkdown({
        contractNumber: '—',
        signedAt: null,
        userEmail: user.email,
        templateHash: template.hash,
        templateVersion: template.version,
        renderedTemplate,
      }),
    };
  }

  async signForUser(userId: string): Promise<UserServiceContractResponse> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Vartotojas nerastas');
    }

    if (user.role !== UserRole.USER) {
      throw new BadRequestException('Paslaugos sutartis skirta tik vartotojams');
    }

    const existing = await this.contractsRepository.findOne({ where: { userId } });
    if (existing) {
      return {
        signed: true,
        canSign: false,
        shouldPrompt: false,
        userEmail: user.email,
        contractNumber: existing.contractNumber,
        signedAt: existing.signedAt.toISOString(),
        templateHash: existing.templateHash,
        templateVersion: existing.templateVersion,
        content: existing.snapshotMarkdown,
      };
    }

    const template = await this.getTemplateSource();
    const context = await this.buildRenderContext(user);
    const renderedTemplate = this.applyPlaceholders(template.content, context);
    const signedAt = new Date();

    const created = await this.contractsRepository.save(
      this.contractsRepository.create({
        userId,
        contractNumber: null,
        signedAt,
        templateHash: template.hash,
        templateVersion: template.version,
        snapshotMarkdown: '',
      }),
    );

    created.contractNumber = this.generateContractNumber(created.id, signedAt);
    created.snapshotMarkdown = this.buildSnapshotMarkdown({
      contractNumber: created.contractNumber,
      signedAt,
      userEmail: user.email,
      templateHash: template.hash,
      templateVersion: template.version,
      renderedTemplate,
    });
    await this.contractsRepository.save(created);

    return {
      signed: true,
      canSign: false,
      shouldPrompt: false,
      userEmail: user.email,
      contractNumber: created.contractNumber,
      signedAt: created.signedAt.toISOString(),
      templateHash: created.templateHash,
      templateVersion: created.templateVersion,
      content: created.snapshotMarkdown,
    };
  }

  private async hasActiveContractRequirement(user: User): Promise<boolean> {
    const hasActiveSubscription = Boolean(
      user.subscriptionValidUntil && user.subscriptionValidUntil.getTime() > Date.now(),
    );
    if (hasActiveSubscription) {
      return true;
    }

    const activeOrderCount = await this.storeOrdersRepository.count({
      where: {
        userId: user.id,
        status: In([StoreOrderStatus.NEW, StoreOrderStatus.IN_PROGRESS]),
      },
    });

    return activeOrderCount > 0;
  }

  private async buildRenderContext(user: User): Promise<ContractRenderContext> {
    const latestOrder = await this.storeOrdersRepository.findOne({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
    });

    return {
      fullName: this.toDisplayValue(latestOrder?.customerName ?? user.name),
      email: this.toDisplayValue(latestOrder?.customerEmail ?? user.email),
      phone: this.toDisplayValue(latestOrder?.customerPhone ?? user.phone),
      address: this.toDisplayValue(latestOrder?.address ?? user.address),
      companyName: this.toDisplayValue(latestOrder?.companyName),
      companyCode: this.toDisplayValue(latestOrder?.companyCode),
      vatCode: this.toDisplayValue(latestOrder?.vatCode),
      orderId: this.toDisplayValue(latestOrder?.id),
      orderCreatedAt: this.toDisplayValue(latestOrder?.createdAt?.toISOString()),
      subscriptionValidUntil: this.toDisplayValue(user.subscriptionValidUntil?.toISOString()),
    };
  }

  private async getTemplateSource(): Promise<TemplateSource> {
    if (this.templateCache) {
      return this.templateCache;
    }

    const content = await this.loadTemplateContent();
    const hash = createHash('sha256').update(content, 'utf8').digest('hex');
    const version = `v-${hash.slice(0, 12)}`;

    this.templateCache = { content, hash, version };
    return this.templateCache;
  }

  private async loadTemplateContent(): Promise<string> {
    const candidates = [
      path.resolve(process.cwd(), 'public', 'service-contract-template.md'),
      path.resolve(__dirname, '..', '..', '..', 'public', 'service-contract-template.md'),
      path.resolve(process.cwd(), '..', 'docs', 'Taisykles.md'),
      path.resolve(process.cwd(), '..', 'docs', 'taisykles.md'),
      path.resolve(process.cwd(), '..', 'docs', 'T&C.md'),
      path.resolve(process.cwd(), 'docs', 'Taisykles.md'),
      path.resolve(process.cwd(), 'docs', 'taisykles.md'),
      path.resolve(process.cwd(), 'docs', 'T&C.md'),
    ];

    for (const candidate of candidates) {
      try {
        return await fs.readFile(candidate, 'utf8');
      } catch {
        // try next path
      }
    }

    throw new NotFoundException('Nerastas sutarties šablonas docs/Taisykles.md');
  }

  private applyPlaceholders(content: string, context: ContractRenderContext): string {
    return content.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, key: string) => {
      const value = context[key as keyof ContractRenderContext];
      return value ?? '—';
    });
  }

  private buildSnapshotMarkdown(input: {
    contractNumber: string;
    signedAt: Date | null;
    userEmail: string;
    templateHash: string;
    templateVersion: string;
    renderedTemplate: string;
  }): string {
    const signedAtLabel = input.signedAt ? this.formatLocalDateTime(input.signedAt) : '—';
    const shortHash = input.templateHash.slice(0, 12);

    return [
      '# Paslaugos sutartis',
      '',
      `Sutartis Nr: ${input.contractNumber}`,
      `Pasirašyta: ${signedAtLabel}`,
      `El. paštas: ${input.userEmail || '—'}`,
      `Šablono versija: ${input.templateVersion}`,
      `Šablono hash: ${shortHash}`,
      '',
      '---',
      '',
      input.renderedTemplate,
    ].join('\n');
  }

  private generateContractNumber(recordId: string, signedAt: Date): string {
    const datePart = signedAt.toISOString().slice(0, 10).replace(/-/g, '');
    const shortId = recordId.replace(/-/g, '').slice(0, 6).toUpperCase();
    return `BM-SUT-${datePart}-${shortId}`;
  }

  private toDisplayValue(value?: string | Date | null): string {
    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value !== 'string') {
      return '—';
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : '—';
  }

  private formatLocalDateTime(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    const hours = String(value.getHours()).padStart(2, '0');
    const minutes = String(value.getMinutes()).padStart(2, '0');
    const seconds = String(value.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
}
