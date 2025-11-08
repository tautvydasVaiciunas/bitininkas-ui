import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  applyImageFallback,
  FALLBACK_MEDIA_SRC,
  isVideo,
  thumbUrl,
  withApiBase,
} from '@/lib/media';

type ThumbnailProps = {
  url?: string | null;
  className?: string;
  onClick?: () => void;
};

export function Thumbnail({ url, className, onClick }: ThumbnailProps) {
  const resolved = thumbUrl(url ?? undefined);
  const isVideoMedia = isVideo(url ?? resolved ?? undefined);

  const baseClasses =
    'w-24 h-20 rounded-lg overflow-hidden bg-muted flex items-center justify-center';
  const interactiveClasses = onClick ? 'cursor-pointer' : '';

  if (!resolved) {
    return (
      <div className={cn(baseClasses, interactiveClasses, className)} onClick={onClick}>
        <img src={FALLBACK_MEDIA_SRC} alt="Miniatiūra" className="h-full w-full object-cover" />
      </div>
    );
  }

  if (isVideoMedia) {
    return (
      <div
        className={cn(
          baseClasses,
          interactiveClasses,
          'relative bg-black text-white',
          className,
        )}
        onClick={onClick}
      >
        <img
          src={FALLBACK_MEDIA_SRC}
          alt="Video miniatiūra"
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
        <Play className="h-8 w-8 text-white drop-shadow-lg" />
      </div>
    );
  }

  return (
    <div className={cn(baseClasses, interactiveClasses, className)} onClick={onClick}>
      <img
        src={withApiBase(resolved)}
        alt="Miniatiūra"
        className="h-full w-full object-cover"
        crossOrigin="anonymous"
        onError={(event) => applyImageFallback(event.currentTarget)}
      />
    </div>
  );
}
