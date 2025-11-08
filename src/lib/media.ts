import { API_BASE_URL } from '@/lib/api';

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg'];

export const FALLBACK_MEDIA_SRC = '/fallback-media.png';

export const resolveMediaUrl = (value?: string | null) => {
  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (value.startsWith('/uploads/')) {
    return API_BASE_URL ? `${API_BASE_URL}${value}` : value;
  }

  return value;
};

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

  const lower = url.toLowerCase();
  if (VIDEO_EXTENSIONS.some((extension) => lower.endsWith(extension))) {
    return 'video';
  }

  return 'image';
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
