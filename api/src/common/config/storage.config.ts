import * as fs from 'fs';
import * as path from 'path';

const UPLOADS_PREFIX = '/uploads';
const NEWS_PLACEHOLDER_RELATIVE = path.join('seed', 'news-default.jpg');
const API_PUBLIC_DIR = path.resolve(__dirname, '..', '..', '..', 'public');
const PUBLIC_FALLBACK = path.join(API_PUBLIC_DIR, 'fallback-media.png');

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

export function ensureUploadsSubdir(name: string): string {
  const baseDir = resolveUploadsDir();
  const targetDir = path.join(baseDir, name);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  return targetDir;
}

export function uploadsPrefix(): string {
  return UPLOADS_PREFIX;
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
      console.warn(`Ispejimas: saltinio failas ${sourceAbsolute} nerastas - praleidziame kopijavima.`);
      return null;
    }

    if (fs.existsSync(destination)) {
      return destination;
    }

    fs.copyFileSync(sourceAbsolute, destination);
    return destination;
  } catch (error) {
    console.warn('Nepavyko nukopijuoti failo i uploads:', error);
    return null;
  }
}

export function ensureNewsPlaceholderFile(): string | null {
  if (!fs.existsSync(PUBLIC_FALLBACK)) {
    console.warn(`Fallback paveikslelis ${PUBLIC_FALLBACK} nerastas - praleidziame kopijavima.`);
    return null;
  }

  return ensureUploadsFile(NEWS_PLACEHOLDER_RELATIVE, PUBLIC_FALLBACK);
}

export function resolvePublicFallback(): string {
  return PUBLIC_FALLBACK;
}
