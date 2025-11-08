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
};

export const ResponsiveMedia = ({
  url,
  type,
  title = 'Medijos peržiūra',
  className,
}: ResponsiveMediaProps) => {
  const [videoError, setVideoError] = useState(false);
  const resolvedUrl = useMemo(() => (url ? withApiBase(url) : null), [url]);
  const mediaType = useMemo(() => {
    if (type) {
      return type;
    }
    if (!url) {
      return null;
    }
    return isVideo(url) ? 'video' : 'image';
  }, [type, url]);

  const wrapperClass = cn(
    'relative w-full overflow-hidden rounded-lg bg-muted aspect-square md:aspect-[16/9]',
    className,
  );

  if (!resolvedUrl) {
    return (
      <div className={wrapperClass}>
        <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Medija nepateikta
        </div>
      </div>
    );
  }

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
          className="h-full w-full object-cover"
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
        className="h-full w-full object-cover"
        loading="lazy"
        crossOrigin="anonymous"
        onError={(event) => applyImageFallback(event.currentTarget)}
      />
    </div>
  );
};
