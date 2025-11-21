import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

export interface EmailPayload {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly client: SESClient | null;
  private readonly from: string | null;

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
        'AWS SES neapkonfigūruotas (AWS_SES_REGION/AWS_SES_ACCESS_KEY_ID/AWS_SES_SECRET_ACCESS_KEY/EMAIL_FROM). Laiškai nebus siųsti.',
      );
    }
  }

  async sendMail(payload: EmailPayload): Promise<void> {
    if (!this.client || !this.from) {
      this.logger.warn(
        `AWS SES siuntimas išjungtas. Laiškas ${payload.subject} adresatui ${payload.to} nebus išsiųstas.`,
      );
      return;
    }

    const body: { Html?: { Data: string; Charset: string }; Text?: { Data: string; Charset: string } } =
      {};

    if (payload.text) {
      body.Text = { Data: payload.text, Charset: 'UTF-8' };
    }

    if (payload.html) {
      body.Html = { Data: payload.html, Charset: 'UTF-8' };
    }

    if (!body.Text && !body.Html) {
      body.Text = { Data: payload.subject, Charset: 'UTF-8' };
    }

    const command = new SendEmailCommand({
      Source: this.from,
      Destination: {
        ToAddresses: [payload.to],
      },
      Message: {
        Subject: { Data: payload.subject, Charset: 'UTF-8' },
        Body: body,
      },
    });

    try {
      await this.client.send(command);
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Nepavyko išsiųsti AWS SES laiško (${payload.to}): ${details}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private normalize(value?: string | null): string | null {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
}
