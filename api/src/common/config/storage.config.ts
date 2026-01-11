import * as fs from 'fs';
import * as path from 'path';

const UPLOADS_PREFIX = '/uploads';
const NEWS_PLACEHOLDER_RELATIVE = path.join('seed', 'news-default.jpg');
const PUBLIC_FALLBACK = path.resolve(process.cwd(), 'public', 'fallback-media.png');

export function resolveUploadsDir(): string {
  const configured = process.env.UPLOAD_DIR?.trim() || process.env.UPLOADS_DIR?.trim();

  if (configured) {
    return path.resolve(configured);
  }

  return path.resolve(process.cwd(), 'uploads');
}

export function ensureUploadsDir(): void {
  const dir = resolveUploadsDir();

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function ensureUploadsSubdir(relativePath: string): string {
  const uploadsDir = resolveUploadsDir();
  const targetDir = path.join(uploadsDir, relativePath);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  return targetDir;
}

export function uploadsPrefix(): string {
  return UPLOADS_PREFIX;
}

export function stripUploadsPrefix(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  let normalized = value.trim();

  const queryIndex = normalized.indexOf('?');
  if (queryIndex !== -1) {
    normalized = normalized.slice(0, queryIndex);
  }

  const hashIndex = normalized.indexOf('#');
  if (hashIndex !== -1) {
    normalized = normalized.slice(0, hashIndex);
  }

  try {
    if (/^https?:\/\//i.test(normalized)) {
      const parsed = new URL(normalized);
      normalized = parsed.pathname;
    }
  } catch {
    // ignore invalid URLs
  }

  if (normalized.startsWith(UPLOADS_PREFIX)) {
    normalized = normalized.slice(UPLOADS_PREFIX.length);
  }

  normalized = normalized.replace(/^\/+/, '');

  return normalized.length ? normalized : null;
}

export const NEWS_PLACEHOLDER_URI = `${uploadsPrefix()}/${NEWS_PLACEHOLDER_RELATIVE.replace(/\\/g, '/')}`;

export function ensureUploadsFile(targetRelative: string, sourceAbsolute: string): string | null {
  try {
    const uploadsDir = resolveUploadsDir();
    const destination = path.join(uploadsDir, targetRelative);
    const destinationDir = path.dirname(destination);

    if (!fs.existsSync(destinationDir)) {
      fs.mkdirSync(destinationDir, { recursive: true });
    }

    if (!fs.existsSync(sourceAbsolute)) {
      console.warn(`Įspėjimas: šaltinio failas ${sourceAbsolute} nerastas – praleidžiame kopijavimą.`);
      return null;
    }

    if (fs.existsSync(destination)) {
      return destination;
    }

    fs.copyFileSync(sourceAbsolute, destination);
    return destination;
  } catch (error) {
    console.warn(
      `Nepavyko nukopijuoti failo į uploads: ${(error as Error)?.message ?? 'nežinoma klaida'}`,
    );
    return null;
  }
}

export function ensureNewsPlaceholderFile(): string | null {
  return ensureUploadsFile(NEWS_PLACEHOLDER_RELATIVE, PUBLIC_FALLBACK);
}

export function resolvePublicFallback(): string {
  return PUBLIC_FALLBACK;
}
