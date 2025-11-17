import { SupportAttachmentPayload } from '@/lib/api';

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'webm', 'm4v']);

type AttachmentPreviewProps = {
  attachment: SupportAttachmentPayload;
};

const resolveByExtension = (url: string | undefined, extensions: Set<string>) => {
  if (!url) {
    return false;
  }
  const parts = url.split('.');
  const extension = parts.at(-1)?.split('?')[0]?.toLowerCase();
  return typeof extension === 'string' && extensions.has(extension);
};

export const SupportAttachmentPreview = ({ attachment }: AttachmentPreviewProps) => {
  if (!attachment?.url) {
    return null;
  }

  const mimeType = (attachment.mimeType ?? '').toLowerCase();
  const isImage =
    attachment.kind === 'image' ||
    mimeType.startsWith('image/') ||
    resolveByExtension(attachment.url, IMAGE_EXTENSIONS);
  const isVideo =
    attachment.kind === 'video' ||
    mimeType.startsWith('video/') ||
    resolveByExtension(attachment.url, VIDEO_EXTENSIONS);

  const openAttachment = () => {
    window.open(attachment.url, '_blank', 'noopener,noreferrer');
  };

  if (isImage) {
    return (
      <button
        type="button"
        className="overflow-hidden rounded-lg border border-border p-0"
        onClick={openAttachment}
        aria-label="Atidaryti paveikslėlio priedą"
      >
        <img
          src={attachment.url}
          alt="Priedas"
          loading="lazy"
          className="h-32 w-full max-w-[280px] rounded-lg object-cover"
        />
      </button>
    );
  }

  if (isVideo) {
    return (
      <div className="w-full max-w-[320px] rounded-lg border border-border bg-black/60">
        <video
          src={attachment.url}
          controls
          className="h-32 w-full rounded-t-lg object-cover"
        />
        <button
          type="button"
          onClick={openAttachment}
          className="w-full border-t border-border px-3 py-1 text-xs text-muted-foreground"
        >
          Peržiūrėti vaizdo įrašą atskirame lange
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
      Atsisiųsti failą.
    </a>
  );
};
