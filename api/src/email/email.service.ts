import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses';
import { readFileSync } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { EmailLayoutOptions, renderEmailLayout } from './email-template';

const LOGO_FILENAME = 'bus-medaus-logo.png';
const LOGO_CID = 'busmedaus-logo';
const FACEBOOK_FILENAME = 'facebook-logo.png';
const FACEBOOK_CID = 'busmedaus-facebook';
const INSTAGRAM_FILENAME = 'instagram-logo.png';
const INSTAGRAM_CID = 'busmedaus-instagram';

export interface EmailPayload {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  mainHtml?: string;
  primaryButtonLabel?: string | null;
  primaryButtonUrl?: string | null;
  replyTo?: string | string[] | null;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly client: SESClient | null;
  private readonly from: string | null;
  private readonly logoBuffer: Buffer | null;
  private readonly facebookBuffer: Buffer | null;
  private readonly instagramBuffer: Buffer | null;

  constructor(private readonly configService: ConfigService) {
    const region = this.normalize(this.configService.get<string>('AWS_SES_REGION'));
    const accessKey = this.normalize(
      this.configService.get<string>('AWS_SES_ACCESS_KEY_ID'),
    );
    const secret = this.normalize(
      this.configService.get<string>('AWS_SES_SECRET_ACCESS_KEY'),
    );
    this.from = this.normalize(this.configService.get<string>('EMAIL_FROM'));

    if (region && accessKey && secret && this.from) {
      this.client = new SESClient({
        region,
        credentials: {
          accessKeyId: accessKey,
          secretAccessKey: secret,
        },
      });
    } else {
      this.client = null;
      this.logger.warn(
        "AWS SES neapkonfiguruotas (AWS_SES_REGION/AWS_SES_ACCESS_KEY_ID/AWS_SES_SECRET_ACCESS_KEY/EMAIL_FROM). Laiškai nebus siunčiami.",
      );
    }

    this.logoBuffer = this.loadAssetBuffer(LOGO_FILENAME, 'logotipo');
    this.facebookBuffer = this.loadAssetBuffer(FACEBOOK_FILENAME, 'Facebook logotipo');
    this.instagramBuffer = this.loadAssetBuffer(INSTAGRAM_FILENAME, 'Instagram logotipo');
  }

  async sendMail(payload: EmailPayload): Promise<void> {
    if (!this.client || !this.from) {
      this.logger.warn(
        `AWS SES siuntimas isjungtas. Laiskas ${payload.subject} adresatui ${payload.to} nebus issiustas.`,
      );
      return;
    }

    const htmlIsLayout =
      payload.html?.includes('<html') || payload.html?.includes('<body');
    const layoutContent = htmlIsLayout ? undefined : payload.mainHtml ?? payload.html;

    const finalHtml = htmlIsLayout
      ? payload.html
      : layoutContent
      ? renderEmailLayout({
          subject: payload.subject,
          mainHtml: layoutContent,
          primaryButtonLabel: payload.primaryButtonLabel ?? null,
          primaryButtonUrl: payload.primaryButtonUrl ?? null,
        })
      : undefined;

    const textBody = payload.text ?? payload.subject;

    const rawMessage = this.buildRawMessage({
      to: payload.to,
      from: this.from,
      subject: payload.subject,
      text: textBody,
      html: finalHtml,
    });

    const command = new SendRawEmailCommand({
      Source: this.from,
      Destinations: [payload.to],
      RawMessage: { Data: Buffer.from(rawMessage) },
    });

    try {
      await this.client.send(command);
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Nepavyko issiusti AWS SES laisko (${payload.to}): ${details}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private buildRawMessage(payload: {
    to: string;
    from: string;
    subject: string;
    text: string;
    html?: string;
    replyTo?: string | string[] | null;
  }): string {
    const boundaryId = randomBytes(12).toString('hex');
    const relatedBoundary = `related_${boundaryId}`;
    const alternativeBoundary = `alt_${boundaryId}`;
    const includesHtml = Boolean(payload.html);
    const includeLogo =
      includesHtml && payload.html?.includes(`cid:${LOGO_CID}`) && this.logoBuffer;
    const includeFacebook =
      includesHtml && payload.html?.includes(`cid:${FACEBOOK_CID}`) && this.facebookBuffer;
    const includeInstagram =
      includesHtml && payload.html?.includes(`cid:${INSTAGRAM_CID}`) && this.instagramBuffer;

    const lines: string[] = [
      `From: ${payload.from}`,
      `To: ${payload.to}`,
      `Subject: ${this.encodeSubject(payload.subject)}`,
      `Date: ${new Date().toUTCString()}`,
      ...(payload.replyTo
        ? [
            `Reply-To: ${this.sanitizeHeaderValue(
              Array.isArray(payload.replyTo) ? payload.replyTo.join(', ') : payload.replyTo,
            )}`,
          ]
        : []),
      'MIME-Version: 1.0',
    ];

    if (!includesHtml) {
      lines.push('Content-Type: text/plain; charset="UTF-8"');
      lines.push('Content-Transfer-Encoding: base64', '', this.encodeBase64Lines(payload.text));
      return lines.join('\r\n');
    }

    lines.push(`Content-Type: multipart/related; boundary="${relatedBoundary}"`, '');
    lines.push(`--${relatedBoundary}`);
    lines.push(`Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`, '');

    lines.push(`--${alternativeBoundary}`);
    lines.push('Content-Type: text/plain; charset="UTF-8"');
    lines.push('Content-Transfer-Encoding: base64', '', this.encodeBase64Lines(payload.text), '');

    lines.push(`--${alternativeBoundary}`);
    lines.push('Content-Type: text/html; charset="UTF-8"');
    lines.push('Content-Transfer-Encoding: base64', '', this.encodeBase64Lines(payload.html ?? ''), '');
    lines.push(`--${alternativeBoundary}--`, '');

    if (includeLogo) {
      this.appendInlineImage(
        lines,
        relatedBoundary,
        LOGO_FILENAME,
        LOGO_CID,
        this.logoBuffer as Buffer,
      );
    }

    if (includeFacebook) {
      this.appendInlineImage(
        lines,
        relatedBoundary,
        FACEBOOK_FILENAME,
        FACEBOOK_CID,
        this.facebookBuffer as Buffer,
      );
    }

    if (includeInstagram) {
      this.appendInlineImage(
        lines,
        relatedBoundary,
        INSTAGRAM_FILENAME,
        INSTAGRAM_CID,
        this.instagramBuffer as Buffer,
      );
    }

    lines.push(`--${relatedBoundary}--`);

    return lines.join('\r\n');
  }

  private appendInlineImage(
    lines: string[],
    boundary: string,
    filename: string,
    cid: string,
    buffer: Buffer,
  ) {
    lines.push(`--${boundary}`);
    lines.push(`Content-Type: image/png; name="${filename}"`);
    lines.push(`Content-ID: <${cid}>`);
    lines.push(`Content-Disposition: inline; filename="${filename}"`);
    lines.push('Content-Transfer-Encoding: base64', '', this.encodeBase64Lines(buffer), '');
  }

  private encodeBase64Lines(value: string | Buffer): string {
    const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf-8');
    const base64 = buffer.toString('base64');
    return base64.match(/.{1,76}/g)?.join('\r\n') ?? '';
  }

  private encodeSubject(subject: string): string {
    if (/^[\x00-\x7F]*$/.test(subject)) {
      return subject;
    }

    const base64 = Buffer.from(subject, 'utf-8').toString('base64');
    return `=?UTF-8?B?${base64}?=`;
  }

  private loadAssetBuffer(filename: string, label: string): Buffer | null {
    const assetPath = join(process.cwd(), 'public', 'assets', filename);
    try {
      return readFileSync(assetPath);
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Nepavyko nuskaityti el. pasto ${label} failo: ${details}`);
      return null;
    }
  }

  private normalize(value?: string | null): string | null {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  private sanitizeHeaderValue(value?: string | null): string {
    if (!value) {
      return '';
    }

    return value.replace(/[\r\n]+/g, ' ').trim();
  }

  renderLayout(options: EmailLayoutOptions): string {
    return renderEmailLayout(options);
  }
}
