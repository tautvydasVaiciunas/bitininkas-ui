import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Paperclip, Trash2 } from 'lucide-react';
import { SupportAttachmentPreview } from '@/components/support/AttachmentPreview';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import api, { HiveHistoryEventResponse, SupportAttachmentPayload } from '@/lib/api';
import {
  describeHiveHistoryEvent,
  formatHiveHistoryTimestamp,
  getHiveHistoryActorLabel,
  getHiveHistoryEventLabel,
} from '@/lib/hiveHistory';

type HiveHistoryTabProps = {
  hiveId: string;
  canManage?: boolean;
};

type HiveHistoryResponse = {
  data: HiveHistoryEventResponse[];
  page: number;
  limit: number;
  total: number;
};

const PAGE_SIZE = 10;

const manualNoteTitle = 'Naujas įrašas avilio istorijoje';

export default function HiveHistoryTab({ hiveId, canManage = false }: HiveHistoryTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [currentEvent, setCurrentEvent] = useState<HiveHistoryEventResponse | null>(null);
  const [formText, setFormText] = useState('');
  const [formAttachments, setFormAttachments] = useState<SupportAttachmentPayload[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setPage(1);
  }, [hiveId]);

  const { data, isLoading, isError, error, isFetching } = useQuery<HiveHistoryResponse>({
    queryKey: ['hive-history', hiveId, page],
    keepPreviousData: true,
    queryFn: () => api.hives.history(hiveId, { page, limit: PAGE_SIZE }),
  });

  const items = data?.data ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const currentPage = data?.page ?? page;
  const isNotFound = error instanceof Error && 'status' in error && (error.status === 404 || error.status === 204);
  const showEmpty = (!isLoading && items.length === 0) || isNotFound;

  const isManagerOrAdmin = (user?.role === 'admin' || user?.role === 'manager' || canManage) ?? false;

  useEffect(() => {
    if (!dialogOpen) {
      resetForm();
    }
  }, [dialogOpen]);

  const resetForm = () => {
    setFormText('');
    setFormAttachments([]);
    setFormError(null);
    setCurrentEvent(null);
  };

  const setFormForEvent = (event: HiveHistoryEventResponse) => {
    const payload = event.payload ?? {};
    setFormText(typeof payload.text === 'string' ? payload.text : '');
    const attachments = Array.isArray(payload.attachments)
      ? (payload.attachments as SupportAttachmentPayload[])
      : [];
    setFormAttachments([...attachments]);
    setCurrentEvent(event);
  };

  const openCreateDialog = () => {
    setDialogMode('create');
    setDialogOpen(true);
  };

  const openEditDialog = (event: HiveHistoryEventResponse) => {
    setDialogMode('edit');
    setFormForEvent(event);
    setDialogOpen(true);
  };

  const handlePageChange = (next: number) => {
    setPage(next);
  };

  const handleAttachmentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) {
      return;
    }
    setUploading(true);
    try {
      const uploaded: SupportAttachmentPayload[] = [];
      for (const file of files) {
        const response = await api.media.upload(file);
        const mimeType = file.type;
        const kind: SupportAttachmentPayload['kind'] = mimeType.startsWith('image')
          ? 'image'
          : mimeType.startsWith('video')
          ? 'video'
          : 'other';
        uploaded.push({
          url: response.url,
          mimeType,
          sizeBytes: file.size,
          kind,
        });
      }
      setFormAttachments((prev) => [...prev, ...uploaded]);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Klaida',
        description: 'Nepavyko įkelti failų.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setFormAttachments((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmitManualNote = async () => {
    if (!formText.trim()) {
      setFormError('Tekstas privalomas');
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      const payload = {
        text: formText.trim(),
        attachments: formAttachments,
      };
      if (dialogMode === 'create') {
        await api.hives.manualNotes.create(hiveId, payload);
        toast({ title: 'Įrašas sukurtas', description: 'Pridėta į avilio istoriją.' });
      } else if (currentEvent) {
        await api.hives.manualNotes.update(currentEvent.id, payload);
        toast({ title: 'Įrašas atnaujintas', description: 'Įrašas sėkmingai atnaujintas.' });
      }
      queryClient.invalidateQueries({ queryKey: ['hive-history', hiveId] });
      setDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Klaida',
        description: 'Nepavyko išsaugoti įrašo.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await api.hives.manualNotes.delete(deleteTarget);
      toast({ title: 'Įrašas pašalintas', description: 'Rankinis įrašas ištrintas.' });
      queryClient.invalidateQueries({ queryKey: ['hive-history', hiveId] });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Klaida',
        description: 'Nepavyko ištrinti įrašo.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
      setDeleteTarget(null);
    }
  };

  const openDeleteDialog = (eventId: string) => {
    setDeleteTarget(eventId);
  };

  const content = useMemo(() => {
    if (isLoading && !data) {
      return (
        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Kraunama istorija...
        </div>
      );
    }

    if (isError && !isNotFound) {
      return (
        <div className="text-center py-8 text-destructive">
          Nepavyko įkelti istorijos. Pabandykite dar kartą.
        </div>
      );
    }

    if (showEmpty) {
      return (
        <div className="text-center py-8 text-muted-foreground">Nėra įvykių.</div>
      );
    }

    return (
      <>
        <ul className="divide-y divide-border">
          {items.map((event) => {
            const descriptor = describeHiveHistoryEvent(event);
            const actorLabel = getHiveHistoryActorLabel(event);
            const isManual = event.type === 'MANUAL_NOTE';

            return (
              <li key={event.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{getHiveHistoryEventLabel(event.type)}</Badge>
                      <p className="font-semibold">{descriptor.title}</p>
                      {isManual && isManagerOrAdmin ? (
                        <div className="flex items-center gap-1 ml-auto">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(event)}>
                            Redaguoti
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(event.id)}>
                            Ištrinti
                          </Button>
                        </div>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">{descriptor.description}</p>
                    {descriptor.attachments?.length ? (
                      <div className="flex flex-wrap gap-3">
                        {descriptor.attachments.map((attachment, idx) => (
                          <SupportAttachmentPreview
                            key={`${event.id}-${idx}`}
                            attachment={attachment}
                            showDownloadAction
                          />
                        ))}
                      </div>
                    ) : null}
                    {descriptor.link ? (
                      <Button variant="link" className="px-0" asChild>
                        <Link to={descriptor.link}>{descriptor.linkLabel ?? 'Peržiūrėti'}</Link>
                      </Button>
                    ) : null}
                  </div>
                  <div className="text-sm text-muted-foreground text-left sm:text-right">
                    <p className="font-medium text-foreground">{actorLabel}</p>
                    <p>{formatHiveHistoryTimestamp(event.createdAt)}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-col gap-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <span>
            Puslapis {currentPage} iš {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1 || isFetching}
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            >
              Ankstesnis
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages || isFetching}
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
            >
              Kitas
            </Button>
          </div>
        </div>
        {isFetching && data ? (
          <p className="text-xs text-muted-foreground">Atnaujinama...</p>
        ) : null}
      </>
    );
  }, [
    currentPage,
    data,
    handlePageChange,
    isError,
    isFetching,
    isLoading,
    isNotFound,
    items,
    showEmpty,
  ]);

  return (
    <>
      <div className="flex items-center justify-between">
        {isManagerOrAdmin ? (
          <Button variant="default" onClick={openCreateDialog} className="gap-2">
            <Paperclip className="h-4 w-4" />
            Pridėti įrašą
          </Button>
        ) : null}
      </div>
      <div className="space-y-4">{content}</div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === 'create' ? 'Pridėti įrašą' : 'Redaguoti įrašą'}</DialogTitle>
            <DialogDescription>Pridėkite tekstą ir (nebūtinai) priedus.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={formText}
              onChange={(event) => setFormText(event.target.value)}
              placeholder="Įrašykite tekstą..."
              rows={4}
            />
            <div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <Paperclip className="h-4 w-4" />
                  Pridėti priedų
                </Button>
                {uploading ? <span className="text-muted-foreground text-sm">Kraunama...</span> : null}
              </div>
              <input
                type="file"
                multiple
                hidden
                ref={fileInputRef}
                onChange={handleAttachmentUpload}
              />
            </div>
            {formAttachments.length ? (
              <div className="flex flex-wrap gap-3">
                {formAttachments.map((attachment, idx) => (
                  <div key={`${attachment.url}-${idx}`} className="relative">
                    <SupportAttachmentPreview attachment={attachment} />
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(idx)}
                      className="absolute -top-1 -right-1 rounded-full bg-destructive/90 p-1 text-white"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            {formError ? <p className="text-xs text-destructive">{formError}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Atšaukti
            </Button>
            <Button onClick={handleSubmitManualNote} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Išsaugoti
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ištrinti įrašą?</AlertDialogTitle>
            <AlertDialogDescription>Ar tikrai norite ištrinti šį rankinį įrašą?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Atšaukti</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEvent} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Ištrinti
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
