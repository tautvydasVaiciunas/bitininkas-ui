import * as fs from 'fs';
import * as path from 'path';

export function resolveUploadsDir(): string {
  const configured =
    process.env.UPLOAD_DIR?.trim() || process.env.UPLOADS_DIR?.trim();

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

export function uploadsPrefix(): string {
  return '/uploads';
}
