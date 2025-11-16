import { SupportAttachmentPayload } from '@/lib/api';

type AttachmentPreviewProps = {
  attachment: SupportAttachmentPayload;
};

export const SupportAttachmentPreview = ({ attachment }: AttachmentPreviewProps) => {
  if (!attachment?.url) {
    return null;
  }

  const mimeType = attachment.mimeType ?? '';
  const isImage = mimeType.startsWith('image/');
  const isVideo = mimeType.startsWith('video/');

  const openAttachment = () => {
    window.open(attachment.url, '_blank', 'noopener,noreferrer');
  };

  if (isImage) {
    return (
      <img
        src={attachment.url}
        alt="Priedas"
        loading="lazy"
        className="h-32 w-full max-w-[240px] rounded-lg object-cover"
        onClick={openAttachment}
        role="button"
        aria-label="Atidaryti paveikslėlį"
      />
    );
  }

  if (isVideo) {
    return (
      <div className="w-full max-w-[320px] rounded-lg border border-border bg-black/60">
        <video
          src={attachment.url}
          controls
          className="h-32 w-full rounded-lg object-cover"
        />
        <button
          type="button"
          onClick={openAttachment}
          className="w-full border-t border-border px-3 py-1 text-xs text-muted-foreground"
        >
          Peržiūrėti video atskirame lange
        </button>
      </div>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
      className="block w-full max-w-[240px] rounded-lg border border-border px-3 py-2 text-xs font-medium text-primary"
    >
      Atsisiųsti failą
    </a>
  );
};
