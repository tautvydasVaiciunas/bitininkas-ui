import { useEffect, useRef, useState, type ChangeEvent, type MouseEvent } from 'react';
import { Loader2, MessageCircle, Paperclip, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import api, {
  FeedbackAttachmentPayload,
  FeedbackRequestPayload,
  SupportUploadResponse,
  resolveMediaUrl,
} from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const MAX_MESSAGE_LENGTH = 4000;

type AttachmentPreview = SupportUploadResponse & { name: string };

export const FeedbackWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [message, setMessage] = useState('');
  const [messageError, setMessageError] = useState('');
  const [attachment, setAttachment] = useState<AttachmentPreview | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pageUrl, setPageUrl] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [deviceInfo, setDeviceInfo] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setPageUrl(window.location.href);
    setPageTitle(document.title ?? '');
    const ua = navigator.userAgent ?? '';
    const language = navigator.language ?? '';
    const sizeHint = `${window.innerWidth}x${window.innerHeight}`;
    const infoParts = [ua, language && `lang=${language}`, `screen=${sizeHint}`].filter(
      Boolean,
    );
    setDeviceInfo(infoParts.join(' | '));
  }, []);

  const handleOpen = (event: MouseEvent<HTMLButtonElement>) => {
    lastTriggerRef.current = event.currentTarget;
    setIsOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      if (typeof window !== 'undefined') {
        window.requestAnimationFrame(() => {
          lastTriggerRef.current?.focus();
        });
      }
    }
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploadError('');
    setUploading(true);

    try {
      const form = new FormData();
      form.append('file', file);
      const response = await api.support.uploadAttachment(form);
      setAttachment({
        ...response,
        name: file.name,
      });
    } catch (error) {
      setUploadError('Nepavyko įkelti failo. Pabandykite dar kartą.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
  };

  const buildPayload = (): FeedbackRequestPayload => {
    const attachments: FeedbackAttachmentPayload[] | undefined = attachment
      ? [
          {
            url: attachment.url,
            mimeType: attachment.mimeType,
            name: attachment.name,
          },
        ]
      : undefined;

    return {
      message: message.trim(),
      pageUrl: pageUrl || undefined,
      pageTitle: pageTitle || undefined,
      deviceInfo: deviceInfo || undefined,
      context: user?.email ? `El. paštas: ${user.email}` : undefined,
      attachments,
    };
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      setMessageError('Aprašykite problemą ar klausimą.');
      return;
    }

    setMessageError('');
    setSubmitting(true);

    try {
      await api.support.sendFeedback(buildPayload());
      toast({
        title: 'Ačiū!',
        description: 'Jūsų atsiliepimas perduotas komandai.',
      });
      setIsOpen(false);
      setMessage('');
      setAttachment(null);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Klaida',
        description: 'Nepavyko išsiųsti atsiliepimo. Pabandykite dar kartą.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="fixed right-4 top-[40%] hidden z-50 flex-col items-center gap-2 rounded-full border border-border/60 bg-foreground/90 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-background shadow-lg transition hover:bg-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:flex"
        onClick={handleOpen}
      >
        <MessageCircle className="h-4 w-4" />
        Atsiliepimas
      </button>
      <button
        type="button"
        className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-background shadow-lg transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:hidden"
        aria-label="Parašyti atsiliepimą"
        onClick={handleOpen}
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Parašykite atsiliepimą</DialogTitle>
            <DialogDescription>
              Papasakokite, kas nusibodo ar ką norėtumėte pagerinti. Automatiškai pridėsime puslapio
              informaciją ir naršyklės duomenis.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="feedback-message">Aprašymas</Label>
            <Textarea
              id="feedback-message"
              placeholder="Čia galite parašyti daugiau detalių apie problemą..."
              value={message}
              maxLength={MAX_MESSAGE_LENGTH}
              rows={6}
              onChange={(event) => setMessage(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {message.length}/{MAX_MESSAGE_LENGTH} ženklų
            </p>
            {messageError && <p className="text-sm text-destructive">{messageError}</p>}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center justify-between gap-2 text-sm font-semibold">
              <span>Pridėkite nuotrauką arba ekranvaizdį (nebūtina)</span>
              <span className="text-xs text-muted-foreground">PNG / JPG / WEBP</span>
            </Label>
            <div className="flex items-center gap-2">
              <input
                id="feedback-upload"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={handleUpload}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={uploading}
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Įkelti...
                  </>
                ) : (
                  <>
                    <Paperclip className="mr-2 h-4 w-4" />
                    Įkelti failą
                  </>
                )}
              </Button>
              {attachment && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRemoveAttachment}
                  className="border border-border/50"
                >
                  Ištrinti
                </Button>
              )}
            </div>
            {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
            {attachment && (
              <div className="flex gap-3 rounded-lg border border-border/50 bg-secondary/40 p-3">
                {attachment.kind === 'image' ? (
                  <img
                    src={resolveMediaUrl(attachment.url)}
                    alt="Pridėtas failas"
                    className="h-20 w-20 rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-md border border-border/60 text-muted-foreground">
                    <Paperclip className="h-6 w-6" />
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-1">
                  <p className="text-sm font-semibold">{attachment.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {attachment.mimeType ?? 'Failo tipas nežinomas'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="self-start rounded-full border border-border/50"
                  onClick={handleRemoveAttachment}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/60 p-3 text-sm text-muted-foreground">
            <p>Puslapis: <span className="text-foreground">{pageTitle || pageUrl}</span></p>
            <p>Vartotojas: {user?.name ?? user?.email ?? 'prisijungęs vartotojas'}</p>
            <p>Įrenginys / naršyklė: {deviceInfo || 'nepateikta'}</p>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsOpen(false)}
              disabled={submitting}
              type="button"
            >
              Atšaukti
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !message.trim()}
              type="button"
            >
              {submitting ? 'Siunčiama...' : 'Siųsti'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
