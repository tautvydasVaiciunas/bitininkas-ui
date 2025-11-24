import { ConfigService } from '@nestjs/config';

const DEFAULT_FRONTEND_URL = 'https://app.busmedaus.lt';

export function getFrontendBaseUrl(configService: ConfigService): string {
  const raw = configService.get<string>('APP_URL')?.trim();
  if (!raw) {
    return DEFAULT_FRONTEND_URL;
  }
  return raw.replace(/\/$/, '');
}

export function resolveFrontendUrl(configService: ConfigService, path: string): string {
  if (!path) {
    return getFrontendBaseUrl(configService);
  }

  if (/^https?:\/\//.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getFrontendBaseUrl(configService)}${normalizedPath}`;
}
