
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Paperclip, Send } from 'lucide-react';
import { MainLayout } from '@/components/Layout/MainLayout';
import api, {
  AdminUserResponse,
  SupportAttachmentPayload,
  SupportMessageResponse,
  SupportThreadAdminResponse,
} from '@/lib/api';
import { cn } from '@/lib/utils';

const MESSAGE_PAGE_LIMIT = 30;

const AdminSupport = () => {
  const [threads, setThreads] = useState<SupportThreadAdminResponse[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [threadsError, setThreadsError] = useState<string | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessageResponse[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [olderCursor, setOlderCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<SupportAttachmentPayload[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [userQuery, setUserQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<AdminUserResponse[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const loadThreads = useCallback(async () => {
    setThreadsLoading(true);
    setThreadsError(null);
    try {
      const data = await api.support.admin.threads();
      setThreads(data);
    } catch {
      setThreadsError('Nepavyko įkelti pokalbių.');
    } finally {
      setThreadsLoading(false);
    }
  }, []);

  const loadThreadMessages = useCallback(async (threadId: string, cursor?: string, appendOlder = false) => {
    if (appendOlder) {
      setLoadingMore(true);
    } else {
      setMessagesLoading(true);
      setMessagesError(null);
    }
    try {
      const params: Parameters<typeof api.support.admin.threadMessages>[1] = {
        limit: MESSAGE_PAGE_LIMIT,
      };
      if (cursor) {
        params.cursor = cursor;
      }
      const page = await api.support.admin.threadMessages(threadId, params);
      const normalized = [...page].reverse();
      setHasMore(page.length === MESSAGE_PAGE_LIMIT);
      if (appendOlder) {
        setMessages((prev) => [...normalized, ...prev]);
      } else {
        setMessages(normalized);
      }
      setOlderCursor(page.at(-1)?.createdAt ?? null);
    } catch {
      if (!appendOlder) {
        setMessagesError('Nepavyko įkelti žinučių.');
      }
    } finally {
      if (appendOlder) {
        setLoadingMore(false);
      } else {
        setMessagesLoading(false);
      }
    }
  }, []);

  const activeThread = threads.find((thread) => thread.id === selectedThreadId) ?? null;

  useEffect(() => {
    const query = userQuery.trim();
    if (!query) {
      setUserSearchResults([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    let active = true;
    setSearchLoading(true);
    setSearchError(null);

    api.users
      .list({ q: query, limit: 5 })
      .then((response) => {
        if (!active) {
          return;
        }
        setUserSearchResults(response.data);
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setUserSearchResults([]);
        setSearchError('Paieška nepavyko.');
      })
      .finally(() => {
        if (!active) {
          return;
        }
        setSearchLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userQuery]);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (!selectedThreadId && threads.length) {
      setSelectedThreadId(threads[0].id);
    }
  }, [threads, selectedThreadId]);

  useEffect(() => {
    if (!activeThread) {
      setMessages([]);
      setOlderCursor(null);
      setHasMore(false);
      return;
    }
    setMessages([]);
    setOlderCursor(null);
    setHasMore(false);
    void loadThreadMessages(activeThread.id);
  }, [activeThread, loadThreadMessages]);

  const handleLoadMore = () => {
    if (!activeThread || !hasMore || loadingMore || !olderCursor) return;
    void loadThreadMessages(activeThread.id, olderCursor, true);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.currentTarget.files;
    if (!files) return;

    const uploaded: SupportAttachmentPayload[] = [];
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append('file', file);
      try {
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
      } catch {
        setSendError('Nepavyko įkelti failo.');
      }
    }

    setAttachments((prev) => [...prev, ...uploaded]);
    event.currentTarget.value = '';
  };

  const handleSelectUser = async (user: AdminUserResponse) => {
    setUserQuery('');
    setUserSearchResults([]);
    try {
      const thread = await api.support.admin.ensureThread(user.id);
      setThreads((prev) => {
        const exists = prev.find((item) => item.id === thread.id);
        if (exists) {
          return prev;
        }
        return [thread, ...prev];
      });
      setSelectedThreadId(thread.id);
    } catch {
      setSearchError('Nepavyko atidaryti pokalbio.');
    }
  };

  const handleSend = async () => {
    if (!activeThread) return;
    const trimmedText = text.trim();
    if (!trimmedText && attachments.length === 0) return;

    const payload: { text?: string; attachments?: SupportAttachmentPayload[] } = {};
    if (trimmedText) {
      payload.text = trimmedText;
    }
    if (attachments.length) {
      payload.attachments = attachments;
    }

    setSending(true);
    setSendError(null);
    try {
      const response = await api.support.admin.createMessage(activeThread.id, payload);
      setMessages((prev) => [...prev, response]);
      setText('');
      setAttachments([]);
    } catch {
      setSendError('Nepavyko išsiųsti žinutės.');
    } finally {
      setSending(false);
    }
  };

  const showLoadMore = hasMore && !!olderCursor;

  return (
    <MainLayout>
      <div className="mx-auto flex w-full max-w-6xl gap-6 py-10 px-4">
        <aside className="w-80 space-y-3 rounded-2xl border border-border bg-background p-4">
          <div className="relative">
            <Input
              placeholder="Ieškoti vartotojo..."
              value={userQuery}
              onChange={(event) => setUserQuery(event.target.value)}
              className="mb-2"
            />
            {userQuery.trim() &&
            (searchLoading || searchError || userSearchResults.length > 0) ? (
              <div className="absolute inset-x-0 top-full z-10 mt-1 max-h-52 overflow-y-auto rounded-xl border bg-background shadow-lg">
                {searchLoading ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">Kraunama...</p>
                ) : searchError ? (
                  <p className="px-3 py-2 text-sm text-destructive">{searchError}</p>
                ) : (
                  userSearchResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSelectUser(user)}
                      className="w-full px-3 py-2 text-left text-sm transition hover:bg-primary/10"
                    >
                      <p className="font-medium">{user.name ?? user.email}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Thread'ai</h2>
          {threadsLoading ? (
            <p className="text-sm text-muted-foreground">Kraunama...</p>
          ) : threadsError ? (
            <p className="text-sm text-destructive">{threadsError}</p>
          ) : (
            threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => setSelectedThreadId(thread.id)}
                className={cn(
                  'w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors',
                  thread.id === activeThread?.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-muted hover:border-primary hover:text-primary',
                )}
              >
                <p className="font-medium">{thread.userName ?? thread.userEmail}</p>
                <p className="text-xs text-muted-foreground">
                  {thread.lastMessageText ?? 'Nėra žinučių'} • {thread.unreadFromUser} neperskaitytų
                </p>
              </button>
            ))
          )}
        </aside>

        <div className="flex-1 space-y-4 rounded-2xl border border-border bg-background/80 p-4 shadow-sm shadow-black/5">
          <header>
            <h1 className="text-xl font-semibold">Žinutės</h1>
            <p className="text-xs text-muted-foreground">Atsakykite į vartotojų klausimus</p>
          </header>
          <div className="max-h-[60vh] space-y-4 overflow-y-auto rounded-xl border border-border/70 p-3">
            {showLoadMore && (
              <div className="flex justify-center">
                <Button variant="ghost" size="sm" onClick={handleLoadMore} disabled={loadingMore}>
                  {loadingMore ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    'Rodyti senesnes žinutes'
                  )}
                </Button>
              </div>
            )}
            {messagesLoading ? (
              <p className="text-center text-sm text-muted-foreground">Kraunama...</p>
            ) : messagesError ? (
              <p className="text-center text-sm text-destructive">{messagesError}</p>
            ) : messages.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">Pasirinkite pokalbį arba parašykite pirmą žinutę.</p>
            ) : (
              messages.map((message) => (
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
                    {message.senderRole === 'user' ? 'Vartotojas' : 'Bus medaus komanda'} •{' '}
                    {new Date(message.createdAt).toLocaleString('lt-LT')}
                  </p>
                  {message.text ? <p className="mt-2 whitespace-pre-wrap">{message.text}</p> : null}
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
                  onChange={handleFileChange}
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
                disabled={sending}
              />
              <Button onClick={handleSend} disabled={sending || (!text.trim() && attachments.length === 0)}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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
            {sendError ? <p className="text-xs text-destructive">{sendError}</p> : null}
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
