import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';

export interface FeedbackAttachmentPayload {
  url: string;
  name?: string;
  mimeType?: string;
}

export interface FeedbackContext {
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  ip?: string | null;
  forwardedIp?: string | null;
  userAgent?: string | null;
  timestamp?: string;
}

export interface FeedbackPayload {
  message: string;
  pageUrl?: string | null;
  pageTitle?: string | null;
  deviceInfo?: string | null;
  attachments?: FeedbackAttachmentPayload[];
  context?: string | null;
}

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);
  private readonly recipient: string;

  constructor(
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    const configured = configService.get<string>('FEEDBACK_EMAIL_TO')?.trim();
    this.recipient = configured && configured.length > 0 ? configured : 'bzzz@busmedaus.lt';
  }

  async sendFeedback(payload: FeedbackPayload, context: FeedbackContext): Promise<void> {
    const timestamp = context.timestamp ?? new Date().toISOString();
    const subjectParts = ['Naujas atsiliepimas'];
    if (payload.pageTitle) {
      subjectParts.push(`- ${payload.pageTitle}`);
    } else if (payload.pageUrl) {
      subjectParts.push(`- ${payload.pageUrl}`);
    }
    const subject = subjectParts.join(' ');

    const metadataEntries = this.buildMetadata(payload, context, timestamp);
    const metadataHtml = metadataEntries
      .map(
        (entry) =>
          `<p><strong>${this.escapeHtml(entry.label)}:</strong> ${this.escapeHtml(entry.value)}</p>`,
      )
      .join('');
    const metadataText = metadataEntries
      .map((entry) => `${entry.label}: ${entry.value}`)
      .join('\n');

    const attachmentList = this.buildAttachmentList(payload.attachments);
    const attachmentHtml = attachmentList.html;
    const attachmentText = attachmentList.text;

    const bodyText = [payload.message.trim(), '', '---', metadataText, '', attachmentText]
      .filter(Boolean)
      .join('\n');
    const bodyHtml = [
      `<p>${this.escapeHtml(payload.message.trim())}</p>`,
      '<hr />',
      metadataHtml,
      attachmentHtml,
    ]
      .filter(Boolean)
      .join('');

    try {
      await this.emailService.sendMail({
        to: this.recipient,
        subject,
        text: bodyText,
        html: bodyHtml,
      });
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Nepavyko siųsti atsiliepimo laiško: ${details}`, error as Error);
    }
  }

  private buildMetadata(
    payload: FeedbackPayload,
    context: FeedbackContext,
    timestamp: string,
  ): { label: string; value: string }[] {
    const rows: { label: string; value: string | null }[] = [
      {
        label: 'Vartotojas',
        value: context.userName
          ? `${context.userName} (${context.userEmail ?? 'be el. pašto'})`
          : context.userEmail ?? null,
      },
      {
        label: 'Vartotojo ID',
        value: context.userId ?? null,
      },
      {
        label: 'Puslapis',
        value: payload.pageTitle ?? payload.pageUrl ?? null,
      },
      {
        label: 'URL',
        value: payload.pageUrl ?? null,
      },
      {
        label: 'Įrenginys / naršyklė',
        value: payload.deviceInfo ?? context.userAgent ?? null,
      },
      {
        label: 'IP',
        value: context.forwardedIp ?? context.ip ?? null,
      },
      {
        label: 'Laikas',
        value: timestamp,
      },
      {
        label: 'Papildoma info',
        value: payload.context ?? null,
      },
    ];

    return rows.filter((row) => row.value && row.value.trim().length > 0) as {
      label: string;
      value: string;
    }[];
  }

  private buildAttachmentList(
    attachments?: FeedbackAttachmentPayload[],
  ): { html: string; text: string } {
    if (!attachments || attachments.length === 0) {
      return { html: '', text: '' };
    }

    const listItems = attachments
      .map((attachment) => {
        const label = attachment.name ?? attachment.url;
        const safeLabel = this.escapeHtml(label);
        const safeUrl = this.escapeHtml(attachment.url);
        return `<li><a href="${safeUrl}" target="_blank" rel="noreferrer noopener">${safeLabel}</a></li>`;
      })
      .join('');

    const textList = attachments
      .map((attachment) => `${attachment.name ?? attachment.url}: ${attachment.url}`)
      .join('\n');

    return {
      html: `<div><strong>Prisegti failai:</strong><ul class="ml-4 list-disc">${listItems}</ul></div>`,
      text: `Prisegti failai:\n${textList}`,
    };
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
