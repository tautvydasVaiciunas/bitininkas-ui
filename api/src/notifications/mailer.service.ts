import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';
import { ServerClient } from 'postmark';
import { Resend } from 'resend';

export interface MailerService {
  sendNotificationEmail(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<void>;
  sendBulkNotificationEmail(
    recipients: string[],
    subject: string,
    html: string,
    text?: string,
  ): Promise<void>;
}

export const MAILER_SERVICE = Symbol('MAILER_SERVICE');

@Injectable()
export class NoopMailer implements MailerService {
  private readonly logger = new Logger(NoopMailer.name);

  async sendNotificationEmail(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<void> {
    this.logger.warn(
      `El. pašto siuntimas išjungtas. Laiškas adresatui ${to} (${subject}) nebus išsiųstas.`,
    );
  }

  async sendBulkNotificationEmail(
    recipients: string[],
    subject: string,
    html: string,
    text?: string,
  ): Promise<void> {
    if (!recipients.length) {
      return;
    }

    this.logger.warn(
      `El. pašto siuntimas išjungtas. Laiškai (${subject}) ${recipients.length} gavėjams nebus išsiųsti.`,
    );
  }
}

@Injectable()
export class PostmarkMailer implements MailerService {
  private readonly logger = new Logger(PostmarkMailer.name);
  private readonly client: ServerClient | null;
  private readonly from: string | null;

  constructor(private readonly configService: ConfigService) {
    const token = this.configService.get<string>('POSTMARK_SERVER_TOKEN');
    const fromAddress = this.configService.get<string>('MAIL_FROM');

    if (token && token.trim() && fromAddress && fromAddress.trim()) {
      this.client = new ServerClient(token.trim());
      this.from = fromAddress.trim();
    } else {
      this.client = null;
      this.from = null;
    }
  }

  async sendNotificationEmail(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<void> {
    if (!this.ensureConfigured()) {
      return;
    }

    try {
      await this.client!.sendEmail({
        From: this.from!,
        To: to,
        Subject: subject,
        HtmlBody: html,
        TextBody: text ?? undefined,
      });
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Postmark nepavyko išsiųsti laiško: ${details}`);
    }
  }

  async sendBulkNotificationEmail(
    recipients: string[],
    subject: string,
    html: string,
    text?: string,
  ): Promise<void> {
    if (!this.ensureConfigured() || !recipients.length) {
      return;
    }

    try {
      await this.client!.sendEmailBatch(
        recipients.map((to) => ({
          From: this.from!,
          To: to,
          Subject: subject,
          HtmlBody: html,
          TextBody: text ?? undefined,
        })),
      );
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Postmark nepavyko išsiųsti laiškų paketui: ${details}`);
    }
  }

  private ensureConfigured() {
    if (!this.client || !this.from) {
      this.logger.warn('Postmark neapkonfigūruotas. Patikrinkite POSTMARK_SERVER_TOKEN ir MAIL_FROM.');
      return false;
    }

    return true;
  }
}

@Injectable()
export class ResendMailer implements MailerService {
  private readonly logger = new Logger(ResendMailer.name);
  private readonly client: Resend | null;
  private readonly from: string | null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    const fromAddress = this.configService.get<string>('MAIL_FROM');

    if (apiKey && apiKey.trim() && fromAddress && fromAddress.trim()) {
      this.client = new Resend(apiKey.trim());
      this.from = fromAddress.trim();
    } else {
      this.client = null;
      this.from = null;
    }
  }

  async sendNotificationEmail(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<void> {
    if (!this.ensureConfigured()) {
      return;
    }

    try {
      await this.client!.emails.send({
        from: this.from!,
        to,
        subject,
        html,
        text: text ?? undefined,
      });
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Resend nepavyko išsiųsti laiško: ${details}`);
    }
  }

  async sendBulkNotificationEmail(
    recipients: string[],
    subject: string,
    html: string,
    text?: string,
  ): Promise<void> {
    if (!this.ensureConfigured() || !recipients.length) {
      return;
    }

    try {
      await this.client!.emails.send({
        from: this.from!,
        to: recipients,
        subject,
        html,
        text: text ?? undefined,
      });
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Resend nepavyko išsiųsti laiškų paketui: ${details}`);
    }
  }

  private ensureConfigured() {
    if (!this.client || !this.from) {
      this.logger.warn('Resend neapkonfigūruotas. Patikrinkite RESEND_API_KEY ir MAIL_FROM.');
      return false;
    }

    return true;
  }
}

@Injectable()
export class SmtpMailer implements MailerService {
  private readonly logger = new Logger(SmtpMailer.name);
  private transporter: Transporter | null = null;
  private readonly from: string | null;

  constructor(private readonly configService: ConfigService) {
    this.from = this.normalize(this.configService.get<string>('MAIL_FROM'));
    this.initializeTransporter();
  }

  async sendNotificationEmail(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<void> {
    if (!this.ensureConfigured()) {
      return;
    }

    try {
      await this.transporter!.sendMail({
        from: this.from!,
        to,
        subject,
        html,
        text: text ?? undefined,
      });
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      this.logger.warn(`SMTP nepavyko išsiųsti laiško: ${details}`);
    }
  }

  async sendBulkNotificationEmail(
    recipients: string[],
    subject: string,
    html: string,
    text?: string,
  ): Promise<void> {
    if (!this.ensureConfigured() || !recipients.length) {
      return;
    }

    try {
      await Promise.all(
        recipients.map((recipient) =>
          this.transporter!.sendMail({
            from: this.from!,
            to: recipient,
            subject,
            html,
            text: text ?? undefined,
          }),
        ),
      );
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      this.logger.warn(`SMTP nepavyko išsiųsti laiškų paketui: ${details}`);
    }
  }

  private initializeTransporter() {
    const host = this.normalize(this.configService.get<string>('SMTP_HOST'));
    const portRaw = this.normalize(this.configService.get<string>('SMTP_PORT'));
    const user = this.normalize(
      this.configService.get<string>('SMTP_USER') ??
        this.configService.get<string>('SMTP_USERNAME'),
    );
    const pass = this.normalize(
      this.configService.get<string>('SMTP_PASS') ??
        this.configService.get<string>('SMTP_PASSWORD'),
    );
    const secureFlag = this.normalize(this.configService.get<string>('SMTP_SECURE'));

    if (!host || !portRaw || !this.from) {
      this.logger.warn(
        'SMTP neapkonfigūruotas. Patikrinkite SMTP_HOST, SMTP_PORT, SMTP_PASS/SMTP_PASSWORD, SMTP_USER ir MAIL_FROM.',
      );
      this.transporter = null;
      return;
    }

    const port = Number(portRaw);

    if (!Number.isFinite(port)) {
      this.logger.warn('SMTP_PORT turi būti sveikas skaičius.');
      this.transporter = null;
      return;
    }

    const secure = this.parseSecure(secureFlag, port);

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  private ensureConfigured() {
    if (!this.transporter || !this.from) {
      this.logger.warn('SMTP paštas neapkonfigūruotas. Laiškas nebus išsiųstas.');
      return false;
    }

    return true;
  }

  private normalize(value?: string | null) {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  private parseSecure(flag: string | null, port: number) {
    if (!flag) {
      return port === 465;
    }

    const normalized = flag.toLowerCase();
    return ['1', 'true', 'yes', 'on'].includes(normalized);
  }
}
