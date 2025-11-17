import type { MouseEvent } from 'react';

import { Download, X } from 'lucide-react';

type SupportLightboxProps = {
  imageUrl: string;
  open: boolean;
  onClose: () => void;
  showDownload?: boolean;
};

export const SupportLightbox = ({ imageUrl, open, onClose, showDownload }: SupportLightboxProps) => {
  if (!open) {
    return null;
  }

  const handleOverlayClick = () => {
    onClose();
  };

  const handleInnerClick = (event: MouseEvent) => {
    event.stopPropagation();
  };

  const handleDownload = () => {
    window.open(imageUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        className="relative flex max-h-[90vh] max-w-[90vw] flex-col items-center justify-center overflow-hidden rounded-2xl border border-border bg-background p-4 shadow-lg"
        onClick={handleInnerClick}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full border border-border bg-muted/60 p-1 text-muted-foreground hover:bg-muted"
          aria-label="Uždaryti peržiūrą"
        >
          <X className="h-4 w-4" />
        </button>
        <img
          src={imageUrl}
          alt="Priedo peržiūra"
          className="max-h-[80vh] max-w-[90vw] object-contain"
        />
        {showDownload ? (
          <button
            type="button"
            onClick={handleDownload}
            className="mt-4 flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted/70"
          >
            <Download className="h-4 w-4" />
            Atsisiųsti
          </button>
        ) : null}
      </div>
    </div>
  );
};
