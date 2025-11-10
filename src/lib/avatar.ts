export const buildAvatarSrc = (url?: string | null): string | undefined => {
  if (!url) {
    return undefined;
  }

  const separator = url.includes('?') ? '&' : '?';
  const cacheBuster = Date.now();
  return `${url}${separator}v=${cacheBuster}`;
};
