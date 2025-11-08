const parsePositiveNumber = (value: string | number | undefined, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 0 ? value : fallback;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return fallback;
};

export const RATE_LIMIT_WINDOW_MS = parsePositiveNumber(
  process.env.RATE_LIMIT_WINDOW_MS,
  60_000,
);

export const RATE_LIMIT_TTL_SECONDS = Math.max(1, Math.ceil(RATE_LIMIT_WINDOW_MS / 1000));

export const RATE_LIMIT_MAX = parsePositiveNumber(process.env.RATE_LIMIT_MAX, 10);

export const UPLOAD_MAX_IMAGE_MB = parsePositiveNumber(process.env.UPLOAD_MAX_IMAGE_MB, 10);
export const UPLOAD_MAX_VIDEO_MB = parsePositiveNumber(process.env.UPLOAD_MAX_VIDEO_MB, 30);

export const UPLOAD_MAX_IMAGE_BYTES = UPLOAD_MAX_IMAGE_MB * 1024 * 1024;
export const UPLOAD_MAX_VIDEO_BYTES = UPLOAD_MAX_VIDEO_MB * 1024 * 1024;

export const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const ALLOWED_VIDEO_MIME_TYPES = new Set(['video/mp4']);

export const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  ...ALLOWED_IMAGE_MIME_TYPES,
  ...ALLOWED_VIDEO_MIME_TYPES,
]);

export const getMaxBytesForMime = (mime: string): number => {
  if (ALLOWED_IMAGE_MIME_TYPES.has(mime)) {
    return UPLOAD_MAX_IMAGE_BYTES;
  }

  if (ALLOWED_VIDEO_MIME_TYPES.has(mime)) {
    return UPLOAD_MAX_VIDEO_BYTES;
  }

  return 0;
};
