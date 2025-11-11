export const buildAvatarSrc = (url?: string | null) => {
  if (!url) {
    return undefined;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return undefined;
  }

  const separator = trimmed.includes('?') ? '&' : '?';
  const cacheBuster = Date.now();
  return `${trimmed}${separator}v=${cacheBuster}`;
};
