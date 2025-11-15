import { useMemo, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/Layout/MainLayout';
import api, { SupportAttachmentPayload, SupportMessageResponse, SupportThreadAdminResponse } from '@/lib/api';
import { Loader2, Paperclip, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const MESSAGE_PAGE_LIMIT = 30;

const AdminSupport = () => {
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<SupportAttachmentPayload[]>([]);

  const { data: threads, isLoading: threadsLoading } = useQuery(
    ['support', 'admin', 'threads'],
    () => api.support.admin.threads(),
  );

  const activeThread = useMemo(() => {
    if (!selectedThread) {
      return threads?.[0] ?? null;
    }
    return threads?.find((thread) => thread.id === selectedThread) ?? null;
  }, [selectedThread, threads]);

  const messagesQuery = useInfiniteQuery({
    queryKey: ['support', 'admin', 'messages', activeThread?.id],
    queryFn: async ({ pageParam }) => {
      if (!activeThread) return [];
      const params = { limit: MESSAGE_PAGE_LIMIT, cursor: pageParam };
      return api.support.admin.threadMessages(activeThread.id, params);
    },
    getNextPageParam: (lastPage) => lastPage.at(-1)?.createdAt,
    enabled: Boolean(activeThread),
  });

  const flattenMessages = messagesQuery.data?.pages.flat().reverse() ?? [];

  const mutation = useMutation({
    mutationFn: () => {
      if (!activeThread) {
        return Promise.reject(new Error('No thread selected'));
      }
      return api.support.admin.createMessage(activeThread.id, {
        text: text.trim() || undefined,
        attachments,
      });
    },
    onSuccess: () => {
      setText('');
      setAttachments([]);
      messagesQuery.refetch();
    },
  });

  const handleSend = () => {
    if (!activeThread) return;
    if (!text.trim() && attachments.length === 0) return;
    mutation.mutate();
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.currentTarget.files;
    if (!files?.length) return;
    const uploaded: SupportAttachmentPayload[] = [];
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append('file', file);
      const response = await api.support.uploadAttachment(form);
      uploaded.push({
        url: response.url,
        mimeType: file.type,
        sizeBytes: file.size,
        kind: file.type.startsWith('image')
          ? 'image'
          : file.type.startsWith('video')
          ? 'video'
          : 'other',
      });
    }
    setAttachments((prev) => [...prev, ...uploaded]);
    event.currentTarget.value = '';
  };

  return (
    <MainLayout>
      <div className="mx-auto flex w-full max-w-6xl gap-6 py-10 px-4">
        <aside className="w-80 space-y-3 rounded-2xl border border-border bg-background p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Thread'ai</h2>
          {threadsLoading ? (
            <p className="text-sm text-muted-foreground">Kraunama...</p>
          ) : (
            threads?.map((thread) => (
              <button
                key={thread.id}
                onClick={() => setSelectedThread(thread.id)}
                className={cn(
                  'w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors',
                  thread.id === activeThread?.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-muted hover:border-primary hover:text-primary',
                )}
              >
                <p className="font-medium">{thread.userName ?? thread.userEmail}</p>
                <p className="text-xs text-muted-foreground">
                  {thread.lastMessageText ?? 'Nėra žinučių'} · {thread.unreadFromUser} neperskaitytų
                </p>
              </button>
            ))
          )}
        </aside>

        <div className="flex-1 space-y-4 rounded-2xl border border-border bg-background/80 p-4 shadow-sm shadow-black/5">
          <header>
            <h1 className="text-xl font-semibold">Žinutės</h1>
            <p className="text-xs text-muted-foreground">
              Atsakykite į vartotojo klausimus ir pridėkite priedus.
            </p>
          </header>
          <div className="max-h-[60vh] space-y-4 overflow-y-auto rounded-xl border border-border/70 p-3">
            {messagesQuery.isLoading ? (
              <p className="text-center text-sm text-muted-foreground">Kraunama...</p>
            ) : (
              flattenMessages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'rounded-2xl px-4 py-3 text-sm shadow-sm',
                    message.senderRole === 'user'
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-primary text-primary-foreground',
                  )}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {message.senderRole === 'user' ? 'Vartotojas' : 'Bus medaus komanda'} ·{' '}
                    {new Date(message.createdAt).toLocaleString('lt-LT')}
                  </p>
                  {message.text ? (
                    <p className="mt-2 whitespace-pre-wrap">{message.text}</p>
                  ) : null}
                  {message.attachments?.length ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {message.attachments.map((attachment) => (
                        <AttachmentPreview key={attachment.url} attachment={attachment} />
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="cursor-pointer rounded-lg border border-dashed border-border px-3 py-2 text-xs font-medium text-muted-foreground">
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFile}
                  accept="image/*,video/mp4"
                />
                <div className="flex items-center gap-1">
                  <Paperclip className="h-4 w-4" />
                  Įkelti failą
                </div>
              </label>
              <Input
                placeholder="Parašykite žinutę..."
                value={text}
                onChange={(event) => setText(event.target.value)}
              />
              <Button onClick={handleSend} disabled={!text.trim() && attachments.length === 0}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {attachments.length ? (
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {attachments.map((attachment) => (
                  <span key={attachment.url} className="truncate rounded-full bg-muted/60 px-3 py-1">
                    {attachment.url.split('/').pop()}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

const AttachmentPreview = ({ attachment }: { attachment: SupportAttachmentPayload }) => {
  if (attachment.kind === 'image') {
    return (
      <img
        src={attachment.url}
        alt="attachment"
        loading="lazy"
        className="h-32 w-full rounded-lg object-cover"
      />
    );
  }

  if (attachment.kind === 'video') {
    return (
      <video
        src={attachment.url}
        controls
        className="h-32 w-full rounded-lg bg-black object-cover"
      />
    );
  }

  return (
    <a href={attachment.url} target="_blank" rel="noreferrer" className="text-xs underline">
      Atidaryti failą
    </a>
  );
};

export default AdminSupport;
