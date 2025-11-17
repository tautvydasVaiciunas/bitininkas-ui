import { useMemo, useState } from 'react';

import { SupportAttachmentPayload } from '@/lib/api';
import { isImage, isVideo, withApiBase } from '@/lib/media';

import { SupportLightbox } from './SupportLightbox';

type AttachmentPreviewProps = {
  attachment: SupportAttachmentPayload;
  showDownloadAction?: boolean;
};

const resolveAttachmentUrl = (attachment: SupportAttachmentPayload) => {
  const normalizedUrl = attachment.url?.trim() ?? '';
  if (!normalizedUrl) {
    return null;
  }

  return withApiBase(normalizedUrl);
};

export const SupportAttachmentPreview = ({
  attachment,
  showDownloadAction = false,
}: AttachmentPreviewProps) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const resolvedUrl = useMemo(() => resolveAttachmentUrl(attachment), [attachment]);
  if (!resolvedUrl) {
    return null;
  }

  const mimeType = (attachment.mimeType ?? '').toLowerCase();
  const isImageAttachment =
    mimeType.startsWith('image/') || isImage(attachment.url) || attachment.kind === 'image';
  const isVideoAttachment =
    mimeType.startsWith('video/') || isVideo(attachment.url) || attachment.kind === 'video';

  const openLightbox = () => {
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  if (isImageAttachment) {
    return (
      <>
        <button
          type="button"
          className="overflow-hidden rounded-xl border border-border p-0"
          onClick={openLightbox}
          aria-label="Atidaryti paveikslėlio peržiūrą"
        >
          <img
            src={resolvedUrl}
            alt="Priedas"
            loading="lazy"
            className="max-h-32 w-full max-w-[240px] rounded-xl object-cover"
          />
        </button>
        <SupportLightbox
          open={lightboxOpen}
          onClose={closeLightbox}
          imageUrl={resolvedUrl}
          showDownload={showDownloadAction}
        />
      </>
    );
  }

  if (isVideoAttachment) {
    return (
      <div className="space-y-2">
        <video
          src={resolvedUrl}
          controls
          className="max-h-48 max-w-full rounded-xl border border-border bg-black/70 object-cover"
        />
        <a
          href={resolvedUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-semibold text-primary underline"
        >
          Atidaryti naujame lange
        </a>
      </div>
    );
  }

  const fileName = resolvedUrl.split('/').pop() ?? 'Failas';

  return (
    <a
      href={resolvedUrl}
      download
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-primary hover:bg-muted/70"
    >
      <span className="text-base">⬇</span>
      {fileName}
    </a>
  );
};
