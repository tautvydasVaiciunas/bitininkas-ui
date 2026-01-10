import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  applyImageFallback,
  FALLBACK_MEDIA_SRC,
  isVideo,
  withApiBase,
} from '@/lib/media';

type ResponsiveMediaProps = {
  url?: string | null;
  type?: 'image' | 'video' | null;
  title?: string;
  className?: string;
  fit?: 'cover' | 'contain';
};

export const ResponsiveMedia = ({
  url,
  type,
  title = 'Medijos peržiūra',
  className,
  fit = 'cover',
}: ResponsiveMediaProps) => {
  const [videoError, setVideoError] = useState(false);
  const normalizedUrl = url?.trim() ?? '';
  const hasMediaUrl = Boolean(normalizedUrl);
  const resolvedUrl = useMemo(
    () => (hasMediaUrl ? withApiBase(normalizedUrl) : FALLBACK_MEDIA_SRC),
    [hasMediaUrl, normalizedUrl],
  );
  const mediaType = useMemo(() => {
    if (type === 'video' && hasMediaUrl) {
      return 'video';
    }
    if (type === 'image') {
      return 'image';
    }
    if (!hasMediaUrl) {
      return 'image';
    }
    return isVideo(normalizedUrl) ? 'video' : 'image';
  }, [type, hasMediaUrl, normalizedUrl]);

  const wrapperClass = cn(
    'relative w-full overflow-hidden rounded-lg bg-muted aspect-square md:aspect-[16/9]',
    className,
  );

  const objectFitClass = fit === 'contain' ? 'object-contain' : 'object-cover';

  if (mediaType === 'video') {
    if (videoError) {
      return (
        <div className={wrapperClass}>
          <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Nepavyko įkelti vaizdo įrašo.
          </div>
        </div>
      );
    }

    return (
      <div className={wrapperClass}>
        <video
          key={resolvedUrl}
          src={resolvedUrl}
          controls
          preload="metadata"
          className={`h-full w-full ${objectFitClass}`}
          crossOrigin="anonymous"
          onError={() => setVideoError(true)}
        />
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <img
        src={resolvedUrl ?? FALLBACK_MEDIA_SRC}
        alt={title}
        className={`h-full w-full ${objectFitClass}`}
        loading="lazy"
        crossOrigin="anonymous"
        onError={(event) => applyImageFallback(event.currentTarget)}
      />
    </div>
  );
};
