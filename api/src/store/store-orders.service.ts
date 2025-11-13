import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository, In } from 'typeorm';

import { StoreOrder, StoreOrderStatus } from './entities/order.entity';
import { StoreOrderItem } from './entities/order-item.entity';
import { StoreProduct } from './entities/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  PaginationService,
  PaginatedResult,
} from '../common/pagination/pagination.service';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { MAILER_SERVICE, MailerService } from '../notifications/mailer.service';
import { Inject } from '@nestjs/common';

interface OrderItemSummary {
  productId: string | null;
  productTitle: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface OrderSummary {
  id: string;
  status: StoreOrderStatus;
  customerName: string;
  customerEmail: string;
  totalAmountCents: number;
  createdAt: Date;
}

export interface OrderDetails extends OrderSummary {
  items: OrderItemSummary[];
  customerPhone: string;
  companyName?: string | null;
  companyCode?: string | null;
  vatCode?: string | null;
  address?: string | null;
  comment?: string | null;
}

@Injectable()
export class StoreOrdersService {
  private readonly logger = new Logger(StoreOrdersService.name);
  private readonly internalNotifyEmail?: string;

  constructor(
    @InjectRepository(StoreOrder)
    private readonly ordersRepository: Repository<StoreOrder>,
    @InjectRepository(StoreOrderItem)
    private readonly orderItemsRepository: Repository<StoreOrderItem>,
    @InjectRepository(StoreProduct)
    private readonly productsRepository: Repository<StoreProduct>,
    private readonly pagination: PaginationService,
    private readonly configService: ConfigService,
    @Inject(MAILER_SERVICE) private readonly mailer: MailerService,
  ) {
    this.internalNotifyEmail = this.configService.get<string>('ORDERS_NOTIFY_EMAIL')?.trim() || undefined;
  }

  private mapOrder(order: StoreOrder, includeItems = false): OrderDetails | OrderSummary {
    const base = {
      id: order.id,
      status: order.status,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      totalAmountCents: order.totalAmountCents,
      createdAt: order.createdAt,
    };

    if (!includeItems) {
      return base;
    }

    return {
      ...base,
      customerPhone: order.customerPhone,
      companyName: order.companyName ?? null,
      companyCode: order.companyCode ?? null,
      vatCode: order.vatCode ?? null,
      address: order.address ?? null,
      comment: order.comment ?? null,
      items:
        order.items?.map((item) => ({
          productId: item.productId ?? null,
          productTitle: item.productTitle,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          lineTotalCents: item.lineTotalCents,
        })) ?? [],
    };
  }

  async createOrder(dto: CreateOrderDto, userId?: string): Promise<OrderDetails> {
    const normalizedItems = dto.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }));

    const grouped = new Map<string, number>();
    for (const item of normalizedItems) {
      const current = grouped.get(item.productId) ?? 0;
      grouped.set(item.productId, current + item.quantity);
    }

    const productIds = Array.from(grouped.keys());
    if (!productIds.length) {
      throw new BadRequestException('Pasirinkite bent vieną produktą');
    }

    const products = await this.productsRepository.find({
      where: { id: In(productIds), isActive: true },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('Vienas ar keli produktai neegzistuoja arba neaktyvūs');
    }

    const itemsToPersist: StoreOrderItem[] = [];
    let totalCents = 0;

    for (const product of products) {
      const quantity = grouped.get(product.id) ?? 0;
      if (quantity <= 0) {
        continue;
      }

      const lineTotal = product.priceCents * quantity;
      totalCents += lineTotal;

      const item = this.orderItemsRepository.create({
        productId: product.id,
        productTitle: product.title,
        quantity,
        unitPriceCents: product.priceCents,
        lineTotalCents: lineTotal,
      });
      itemsToPersist.push(item);
    }

    if (!itemsToPersist.length) {
      throw new BadRequestException('Netinkami produkto kiekiai');
    }

    const order = this.ordersRepository.create({
      status: StoreOrderStatus.NEW,
      customerName: dto.customer.name.trim(),
      customerEmail: dto.customer.email.trim(),
      customerPhone: dto.customer.phone.trim(),
      companyName: dto.customer.companyName?.trim() || null,
      companyCode: dto.customer.companyCode?.trim() || null,
      vatCode: dto.customer.vatCode?.trim() || null,
      address: dto.customer.address?.trim() || null,
      comment: dto.customer.comment?.trim() || null,
      totalAmountCents: totalCents,
      userId: userId ?? null,
      items: itemsToPersist,
    });

    const saved = await this.ordersRepository.manager.transaction(async (manager) => {
      const savedOrder = await manager.getRepository(StoreOrder).save(order);
      const itemsWithOrder = itemsToPersist.map((item) => ({
        ...item,
        orderId: savedOrder.id,
      }));
      const savedItems = await manager.getRepository(StoreOrderItem).save(itemsWithOrder);
      savedOrder.items = savedItems;
      return savedOrder;
    });

    this.sendOrderEmails(saved).catch((error) => {
      this.logger.warn(
        `Nepavyko išsiųsti užsakymo el. laiškų (${saved.id}): ${error instanceof Error ? error.message : error}`,
      );
    });

    return this.mapOrder(await this.getOrderEntity(saved.id, true), true) as OrderDetails;
  }

  async listForAdmin(query: ListOrdersQueryDto): Promise<PaginatedResult<OrderSummary>> {
    const { page, limit } = this.pagination.getPagination(query);
    const qb = this.ordersRepository.createQueryBuilder('order');

    if (query.status) {
      qb.andWhere('order.status = :status', { status: query.status });
    }

    qb.orderBy('order.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [orders, total] = await qb.getManyAndCount();
    const data = orders.map((order) => this.mapOrder(order));

    return this.pagination.buildResponse(data, page, limit, total);
  }

  async getOrderDetails(id: string): Promise<OrderDetails> {
    const order = await this.getOrderEntity(id, true);
    return this.mapOrder(order, true) as OrderDetails;
  }

  private async getOrderEntity(id: string, withItems = false): Promise<StoreOrder> {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: withItems ? { items: true } : undefined,
    });

    if (!order) {
      throw new NotFoundException('Užsakymas nerastas');
    }

    if (withItems && order.items) {
      order.items.sort((a, b) => a.productTitle.localeCompare(b.productTitle));
    }

    return order;
  }

  private async sendOrderEmails(order: StoreOrder) {
    const fullOrder = await this.getOrderEntity(order.id, true);
    const items = fullOrder.items ?? [];

    const html = this.buildEmailHtml(fullOrder, items);
    const text = this.buildEmailText(fullOrder, items);
    const subject = `Naujas užsakymas #${fullOrder.id.slice(0, 8).toUpperCase()}`;

    await this.mailer.sendNotificationEmail(fullOrder.customerEmail, subject, html, text);

    if (this.internalNotifyEmail) {
      await this.mailer.sendNotificationEmail(this.internalNotifyEmail, subject, html, text);
    } else {
      this.logger.warn('ORDERS_NOTIFY_EMAIL nenurodytas – vidinis pranešimas neišsiųstas');
    }
  }

  private buildEmailHtml(order: StoreOrder, items: StoreOrderItem[]): string {
    const rows = items
      .map(
        (item) => `
          <tr>
            <td>${this.escape(item.productTitle)}</td>
            <td>${item.quantity}</td>
            <td>${this.formatPrice(item.unitPriceCents)}</td>
            <td>${this.formatPrice(item.lineTotalCents)}</td>
          </tr>
        `,
      )
      .join('');

    return `
      <h2>Užsakymas #${order.id.slice(0, 8).toUpperCase()}</h2>
      <p>Vardas: ${this.escape(order.customerName)}</p>
      <p>El. paštas: ${this.escape(order.customerEmail)}</p>
      <p>Telefonas: ${this.escape(order.customerPhone)}</p>
      ${order.companyName ? `<p>Įmonė: ${this.escape(order.companyName)}</p>` : ''}
      ${order.companyCode ? `<p>Kodas: ${this.escape(order.companyCode)}</p>` : ''}
      ${order.vatCode ? `<p>PVM kodas: ${this.escape(order.vatCode)}</p>` : ''}
      ${order.address ? `<p>Adresas: ${this.escape(order.address)}</p>` : ''}
      ${order.comment ? `<p>Komentaras: ${this.escape(order.comment)}</p>` : ''}
      <table cellpadding="6" cellspacing="0" border="1" style="border-collapse: collapse; margin-top: 16px;">
        <thead>
          <tr>
            <th>Produktas</th>
            <th>Kiekis</th>
            <th>Kaina</th>
            <th>Suma</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="text-align: right;"><strong>Iš viso</strong></td>
            <td><strong>${this.formatPrice(order.totalAmountCents)}</strong></td>
          </tr>
        </tfoot>
      </table>
    `;
  }

  private buildEmailText(order: StoreOrder, items: StoreOrderItem[]): string {
    const lines = items.map(
      (item) =>
        `${item.productTitle} x ${item.quantity} = ${this.formatPrice(item.lineTotalCents)}`,
    );

    return [
      `Užsakymas #${order.id.slice(0, 8).toUpperCase()}`,
      `Vardas: ${order.customerName}`,
      `El. paštas: ${order.customerEmail}`,
      `Telefonas: ${order.customerPhone}`,
      order.companyName ? `Įmonė: ${order.companyName}` : null,
      order.companyCode ? `Kodas: ${order.companyCode}` : null,
      order.vatCode ? `PVM kodas: ${order.vatCode}` : null,
      order.address ? `Adresas: ${order.address}` : null,
      order.comment ? `Komentaras: ${order.comment}` : null,
      '',
      ...lines,
      '',
      `Iš viso: ${this.formatPrice(order.totalAmountCents)}`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  private formatPrice(cents: number) {
    return `${(cents / 100).toFixed(2)} €`;
  }

  private escape(value: string | null | undefined) {
    if (!value) {
      return '';
    }

    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
