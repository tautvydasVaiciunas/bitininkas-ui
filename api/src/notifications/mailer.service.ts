import { createConnection, Socket } from 'node:net';
import { connect as createTlsConnection } from 'node:tls';
import { once } from 'node:events';

import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';

import { User } from '../users/user.entity';

export interface MailerMessage {
  userId: string;
  subject: string;
  body: string;
  link?: string | null;
}

export interface MailerPort {
  send(message: MailerMessage): Promise<void>;
}

export const MAILER_PORT = Symbol('MAILER_PORT');

@Injectable()
export class ConsoleMailer implements MailerPort {
  private readonly logger = new Logger(ConsoleMailer.name);

  async send(message: MailerMessage): Promise<void> {
    this.logger.log(
      `Mock email to user ${message.userId}: ${message.subject}`,
    );
  }
}

@Injectable()
export class SmtpMailer implements MailerPort {
  private readonly logger = new Logger(SmtpMailer.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async send(message: MailerMessage): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { id: message.userId },
    });

    if (!user || !user.email) {
      throw new Error(`User ${message.userId} has no email address`);
    }

    const socket = await this.createSocket();
    const host = this.configService.get<string>('SMTP_HOST');
    const portValue = this.configService.get<string>('SMTP_PORT');
    const from = this.getFromAddress();
    const credentials = this.getCredentials();

    try {
      const greeting = await this.readResponse(socket);
      if (greeting.code !== 220) {
        throw new Error(`Unexpected SMTP greeting: ${greeting.message}`);
      }

      await this.sendCommand(socket, `EHLO ${this.getClientHostname()}`, [250]);

      if (credentials) {
        await this.sendCommand(socket, 'AUTH LOGIN', [334]);
        await this.sendCommand(
          socket,
          Buffer.from(credentials.user).toString('base64'),
          [334],
        );
        await this.sendCommand(
          socket,
          Buffer.from(credentials.pass).toString('base64'),
          [235],
        );
      }

      await this.sendCommand(socket, `MAIL FROM:<${from.address}>`, [250, 251]);
      await this.sendCommand(socket, `RCPT TO:<${user.email}>`, [250, 251]);
      await this.sendCommand(socket, 'DATA', [354]);

      const textBody = message.link
        ? `${message.body}\n\nNuoroda: ${message.link}`
        : message.body;

      const payload = [
        `From: ${from.name} <${from.address}>`,
        `To: ${user.email}`,
        `Subject: ${message.subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        '',
        textBody,
      ].join('\r\n');

      socket.write(`${payload}\r\n.\r\n`);

      const dataResponse = await this.readResponse(socket);
      if (dataResponse.code !== 250) {
        throw new Error(`SMTP DATA command failed: ${dataResponse.message}`);
      }

      await this.sendCommand(socket, 'QUIT', [221]);
      this.logger.log(
        `Email delivered via ${host ?? 'unknown'}:${portValue ?? '0'} to ${user.email}`,
      );
    } finally {
      socket.end();
    }
  }

  private getFromAddress() {
    const address =
      this.configService.get<string>('SMTP_FROM_EMAIL') ?? 'noreply@example.com';
    const name = this.configService.get<string>('SMTP_FROM_NAME') ?? 'Bitininkas';
    return { address, name };
  }

  private getCredentials() {
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASSWORD');

    if (!user || !pass) {
      return null;
    }

    return { user, pass };
  }

  private getClientHostname() {
    return this.configService.get<string>('SMTP_CLIENT_ID') ?? 'localhost';
  }

  private async createSocket(): Promise<Socket> {
    const host = this.configService.get<string>('SMTP_HOST');
    const portValue = this.configService.get<string>('SMTP_PORT');
    const secureEnv = this.configService.get<string>('SMTP_SECURE');

    if (!host || !portValue) {
      throw new Error('SMTP configuration is missing');
    }

    const port = Number(portValue);

    if (!Number.isFinite(port)) {
      throw new Error('SMTP port is invalid');
    }

    const secure = secureEnv ? secureEnv === 'true' || secureEnv === '1' : port === 465;

    return new Promise<Socket>((resolve, reject) => {
      const socket = secure
        ? createTlsConnection({ host, port })
        : createConnection({ host, port });

      const cleanup = () => {
        socket.removeAllListeners('error');
        socket.removeAllListeners('connect');
        socket.removeAllListeners('secureConnect');
      };

      const handleError = (error: Error) => {
        cleanup();
        reject(error);
      };

      const handleConnect = () => {
        cleanup();
        resolve(socket);
      };

      socket.once('error', handleError);

      if (secure) {
        socket.once('secureConnect', handleConnect);
      } else {
        socket.once('connect', handleConnect);
      }
    });
  }

  private async readResponse(socket: Socket) {
    let buffer = '';

    while (true) {
      const [chunk] = await once(socket, 'data');
      buffer += chunk.toString('utf-8');

      const lines = buffer.split(/\r?\n/).filter((line) => line.length >= 4);

      if (!lines.length) {
        continue;
      }

      const lastLine = lines[lines.length - 1];
      const code = Number(lastLine.slice(0, 3));

      if (Number.isNaN(code)) {
        continue;
      }

      if (lastLine[3] === '-') {
        continue;
      }

      return { code, message: buffer.trim() };
    }
  }

  private async sendCommand(socket: Socket, command: string, expectedCodes: number[]) {
    socket.write(`${command}\r\n`);
    const response = await this.readResponse(socket);

    if (expectedCodes.length && !expectedCodes.includes(response.code)) {
      throw new Error(
        `SMTP command "${command}" failed with ${response.code}: ${response.message}`,
      );
    }

    return response;
  }
}
