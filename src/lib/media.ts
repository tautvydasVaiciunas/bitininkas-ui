import { API_BASE_URL } from '@/lib/config';

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov'];

export const FALLBACK_MEDIA_SRC = '/fallback-media.png';

const normalizeUrl = (value?: string | null) => value?.trim() ?? '';

export const withApiBase = (value?: string | null) => {
  const normalized = normalizeUrl(value);
  if (!normalized) {
    return normalized;
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  if (normalized.startsWith('/uploads')) {
    return API_BASE_URL ? `${API_BASE_URL}${normalized}` : normalized;
  }

  return normalized;
};

export const resolveMediaUrl = (value?: string | null) => {
  const normalized = normalizeUrl(value);
  if (!normalized) {
    return null;
  }

  return withApiBase(normalized);
};

const endsWithExtension = (value: string, extensions: string[]) =>
  extensions.some((extension) => value.toLowerCase().endsWith(extension));

export const isImage = (value?: string | null) => {
  const normalized = normalizeUrl(value);
  if (!normalized) {
    return false;
  }

  return endsWithExtension(normalized, IMAGE_EXTENSIONS);
};

export const isVideo = (value?: string | null) => {
  const normalized = normalizeUrl(value);
  if (!normalized) {
    return false;
  }

  return endsWithExtension(normalized, VIDEO_EXTENSIONS);
};

export const thumbUrl = (value?: string | null) => resolveMediaUrl(value);

export const inferMediaType = (
  explicit?: string | null,
  url?: string | null,
): 'image' | 'video' | null => {
  if (explicit === 'image' || explicit === 'video') {
    return explicit;
  }

  if (!url) {
    return null;
  }

  if (isVideo(url)) {
    return 'video';
  }

  if (isImage(url)) {
    return 'image';
  }

  return null;
};

export const applyImageFallback = (img: HTMLImageElement | null) => {
  if (!img) {
    return;
  }

  if (img.dataset.fallbackApplied === '1') {
    return;
  }

  img.dataset.fallbackApplied = '1';
  img.src = FALLBACK_MEDIA_SRC;
};
