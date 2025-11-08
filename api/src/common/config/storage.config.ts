import fs from 'node:fs';
import path from 'node:path';

const resolveUploadsDir = () => {
  const configured = process.env.UPLOADS_DIR?.trim();
  if (configured) {
    return path.resolve(configured);
  }

  return path.resolve(process.cwd(), 'uploads');
};

export const UPLOADS_DIR = resolveUploadsDir();

export const ensureUploadsDirExists = () => {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
};
