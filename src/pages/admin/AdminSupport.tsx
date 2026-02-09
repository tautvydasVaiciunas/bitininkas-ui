
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Paperclip, Send } from 'lucide-react';
import { MainLayout } from '@/components/Layout/MainLayout';
import { SupportAttachmentPreview } from '@/components/support/AttachmentPreview';
import api, {
  AdminUserResponse,
  SupportAttachmentPayload,
  SupportMessageResponse,
  SupportThreadAdminResponse,
} from '@/lib/api';
import { cn } from '@/lib/utils';
import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

const MESSAGE_PAGE_LIMIT = 30;
const THREAD_PAGE_LIMIT = 20;

const AdminSupport = () => {
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [userQuery, setUserQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<AdminUserResponse[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const previousThreadIdRef = useRef<string | null>(null);
  const appliedThreadParamRef = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const threadsQuery = useInfiniteQuery({
    queryKey: ['supportThreads'],
    queryFn: ({ pageParam = 1 }) =>
      api.support.admin.threads({ page: pageParam, limit: THREAD_PAGE_LIMIT }),
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === THREAD_PAGE_LIMIT ? pages.length + 1 : undefined,
    refetchOnWindowFocus: false,
  });

  const threadList = useMemo(() => threadsQuery.data?.pages.flat() ?? [], [threadsQuery.data]);
  const threads = useMemo(() => {
    return [...threadList].sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [threadList]);
  const threadsLoading = threadsQuery.isLoading;
  const threadsError = threadsQuery.isError ? 'Nepavyko įkelti pokalbių.' : null;
  const hasMoreThreads = Boolean(threadsQuery.hasNextPage);
  const loadingMoreThreads = threadsQuery.isFetchingNextPage;
  const { refetch: refetchThreads } = threadsQuery;

  const updateThreadSummary = useCallback(
    (threadId: string, updates: Partial<SupportThreadAdminResponse>) => {
      queryClient.setQueryData<InfiniteData<SupportThreadAdminResponse[]>>(
        ['supportThreads'],
        (old) => {
          if (!old) return old;
          let updatedThread: SupportThreadAdminResponse | null = null;
          const pages = old.pages.map((page) =>
            page.filter((thread) => {
              if (thread.id !== threadId) {
                return true;
              }
              updatedThread = { ...thread, ...updates };
              return false;
            }),
          );
          if (!updatedThread) {
            return old;
          }
          const firstPage = pages[0] ?? [];
          pages[0] = [updatedThread, ...firstPage];
          return { ...old, pages };
        },
      );
    },
    [queryClient],
  );

  const upsertThread = useCallback(
    (thread: SupportThreadAdminResponse) => {
      queryClient.setQueryData<InfiniteData<SupportThreadAdminResponse[]>>(
        ['supportThreads'],
        (old) => {
          if (!old) {
            return { pageParams: [1], pages: [[thread]] };
          }
          const pages = old.pages.map((page) => page.filter((item) => item.id !== thread.id));
          pages[0] = [thread, ...pages[0]];
          return { ...old, pages };
        },
      );
    },
    [queryClient],
  );

  const loadThreads = useCallback(async () => {
    await refetchThreads();
  }, [refetchThreads]);

  useEffect(() => {
    const threadIdParam = searchParams.get('threadId');
    if (!threadIdParam || appliedThreadParamRef.current === threadIdParam) {
      return;
    }

    appliedThreadParamRef.current = threadIdParam;
    setSelectedThreadId(threadIdParam);

    if (!threadList.some((thread) => thread.id === threadIdParam)) {
      api.support.admin
        .thread(threadIdParam)
        .then((thread) => {
          upsertThread(thread);
        })
        .catch(() => {
          setSearchError('Nepavyko atidaryti pokalbio.');
        });
    }
  }, [searchParams, threadList, upsertThread]);

  const refreshThreadList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['supportThreads'] });
  }, [queryClient]);

  const loadThreadMessages = useCallback(async (
    threadId: string,
    cursor?: string,
    appendOlder = false,
    refresh = false,
  ) => {
    if (appendOlder) {
      setLoadingMore(true);
    } else if (!refresh) {
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
      setHasMore((prev) => prev || page.length === MESSAGE_PAGE_LIMIT);
      if (!appendOlder) {
        updateThreadSummary(threadId, { unreadFromUser: 0 });
      }
      if (appendOlder) {
        setMessages((prev) => [...normalized, ...prev]);
        setOlderCursor(page.at(-1)?.createdAt ?? null);
      } else if (refresh) {
        setMessages((prev) => {
          const merged = new Map(prev.map((item) => [item.id, item]));
          normalized.forEach((item) => {
            merged.set(item.id, item);
          });
          return Array.from(merged.values()).sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );
        });
        setOlderCursor((prev) => prev ?? page.at(-1)?.createdAt ?? null);
      } else {
        setMessages(normalized);
        setOlderCursor(page.at(-1)?.createdAt ?? null);
      }
      if (!appendOlder) {
        refreshThreadList();
      }
    } catch {
      if (!appendOlder && !refresh) {
        setMessagesError('Nepavyko ?kelti ?inu?i?.');
      }
    } finally {
      if (appendOlder) {
        setLoadingMore(false);
      } else if (!refresh) {
        setMessagesLoading(false);
      }
    }
  }, [refreshThreadList]);

  const activeThread = threadList.find((thread) => thread.id === selectedThreadId) ?? null;

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
        const results = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
          ? response.data
          : [];
        setUserSearchResults(results);
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
    if (!selectedThreadId) {
      setMessages([]);
      setOlderCursor(null);
      setHasMore(false);
      previousThreadIdRef.current = null;
      return;
    }

    if (previousThreadIdRef.current === selectedThreadId) {
      return;
    }

    previousThreadIdRef.current = selectedThreadId;
    setMessages([]);
    setOlderCursor(null);
    setHasMore(false);
    void loadThreadMessages(selectedThreadId);
  }, [selectedThreadId, loadThreadMessages]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadThreads({ silent: true });

      if (selectedThreadId && !loadingMore && !messagesLoading) {
        void loadThreadMessages(selectedThreadId, undefined, false, true);
      }
    }, 10_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadThreadMessages, loadThreads, loadingMore, messagesLoading, selectedThreadId, threadsLoading]);

  const handleLoadMore = () => {
    if (!activeThread || !hasMore || loadingMore || !olderCursor) return;
    void loadThreadMessages(activeThread.id, olderCursor, true);
  };

  const handleLoadMoreThreads = () => {
    if (!hasMoreThreads || loadingMoreThreads) return;
    void threadsQuery.fetchNextPage();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    if (files.length === 0) {
      return;
    }

    const getMaxBytesForFile = (file: File) => {
      if (file.type.startsWith('image/')) {
        return 10 * 1024 * 1024;
      }
      if (file.type.startsWith('video/')) {
        return 30 * 1024 * 1024;
      }
      return 0;
    };

    const uploaded: SupportAttachmentPayload[] = [];
    let uploadError = false;
    let sizeTooLarge = false;

    for (const file of files) {
      const maxBytes = getMaxBytesForFile(file);
      if (maxBytes > 0 && file.size > maxBytes) {
        uploadError = true;
        sizeTooLarge = true;
        continue;
      }
      const form = new FormData();
      form.append('file', file);
      try {
        const response = await api.support.uploadAttachment(form);
        uploaded.push({
          url: response.url,
          mimeType: response.mimeType,
          sizeBytes: response.sizeBytes,
          kind: response.kind,
        });
      } catch {
        uploadError = true;
      }
    }

    if (sizeTooLarge) {
      setSendError('Failas per didelis. Maksimalus dydis: 10 MB nuotraukai, 30 MB vaizdo įrašui.');
    } else if (uploadError) {
      setSendError('Nepavyko įkelti failo.');
    }

    if (uploaded.length) {
      setAttachments((prev) => [...prev, ...uploaded]);
    }

    const target = fileInputRef.current ?? input;
    if (target) {
      target.value = '';
    }
  };

  const handleSelectUser = async (user: AdminUserResponse) => {
    setUserQuery('');
    setUserSearchResults([]);
    try {
      const thread = await api.support.admin.ensureThread(user.id);
      upsertThread(thread);
      setSelectedThreadId(thread.id);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('threadId', thread.id);
      setSearchParams(nextParams, { replace: true });
    } catch {
      setSearchError('Nepavyko atidaryti pokalbio.');
    }
  };

  const handleSend = async () => {
    if (!activeThread) {
      setSendError('Pasirinkite pokalbį.');
      return;
    }
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
      const messageText =
        response.text ??
        (trimmedText ? trimmedText : attachments.length ? 'Prisegtas failas' : null);
      updateThreadSummary(activeThread.id, {
        lastMessageText: messageText,
        lastMessageAt: response.createdAt,
        unreadFromUser: 0,
      });
    } catch {
      setSendError('Nepavyko išsiųsti žinutės.');
    } finally {
      setSending(false);
    }
  };

  const showLoadMore = hasMore && !!olderCursor;
  const showLoadMoreThreads = hasMoreThreads;

  return (
    <MainLayout>
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10 min-h-[calc(100vh-12rem)] lg:min-h-[calc(100vh-9rem)]">
        <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row">
          <aside className="flex min-h-0 flex-col gap-4 rounded-2xl border border-border bg-background/60 p-4 shadow-sm shadow-black/5 lg:w-80 lg:flex-none lg:h-full lg:max-h-[calc(100vh-9rem)]">
            <div className="flex h-full flex-1 flex-col gap-4 overflow-hidden">
              <div className="sticky top-0 z-10 bg-background/95 pb-3 pt-1">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Pokalbiai
                </h2>
                <p className="text-xs text-muted-foreground">
                  Raskite vartotoją arba pasirinkite esamą temą.
                </p>
                <div className="relative">
                  <Input
                    placeholder="Ieškoti vartotojo..."
                    value={userQuery}
                    onChange={(event) => setUserQuery(event.target.value)}
                    className="mb-2"
                  />
                  {userQuery.trim() &&
                  (searchLoading || searchError || userSearchResults.length > 0) ? (
                    <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-xl border bg-background shadow-lg">
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
              </div>
              <div className="flex-1 overflow-y-auto pb-1">
                {threadsLoading ? (
                  <p className="text-sm text-muted-foreground">Kraunama...</p>
                ) : threadsError ? (
                  <p className="text-sm text-destructive">{threadsError}</p>
                ) : (
                  <div className="space-y-2">
                    {threads.map((thread) => (
                      <button
                        key={thread.id}
                        onClick={() => {
                          setSelectedThreadId(thread.id);
                          const nextParams = new URLSearchParams(searchParams);
                          nextParams.set('threadId', thread.id);
                          setSearchParams(nextParams, { replace: true });
                        }}
                        className={cn(
                          'w-full rounded-2xl border px-3 py-3 text-left text-sm transition-colors',
                          thread.id === activeThread?.id
                            ? 'border-primary bg-primary/10 text-primary'
                            : thread.unreadFromUser > 0
                            ? 'border-amber-300 bg-amber-50 text-foreground hover:border-amber-400'
                            : 'border-border bg-muted/80 hover:border-primary hover:text-foreground',
                        )}
                      >
                        <p className="font-medium">{thread.userName ?? 'Vartotojas'}</p>
                        {thread.userEmail ? (
                          <p className="text-xs text-muted-foreground">{thread.userEmail}</p>
                        ) : null}
                        <p
                          className={cn(
                            'text-xs',
                            thread.unreadFromUser > 0
                              ? 'text-amber-800'
                              : 'text-muted-foreground',
                          )}
                        >
                          {thread.lastMessageText ?? 'Nėra žinučių'} • {thread.unreadFromUser} neperskaitytų
                        </p>
                      </button>
                    ))}
                    {showLoadMoreThreads ? (
                      <div className="flex justify-center pt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleLoadMoreThreads}
                          disabled={loadingMoreThreads}
                        >
                          {loadingMoreThreads ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            'Rodyti daugiau'
                          )}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </aside>

          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="flex flex-1 min-h-0 flex-col gap-4 rounded-2xl border border-border bg-background/80 p-4 shadow-sm shadow-black/5">
              <header className="space-y-1">
              <h1 className="text-xl font-semibold">Žinutės</h1>
              <p className="text-xs text-muted-foreground">Atsakykite į vartotojų klausimus</p>
            </header>
            <div className="flex-1 overflow-hidden rounded-xl border border-border/70 bg-white/80 p-3">
              <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
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
                  {message.text ? <p className="mt-2 whitespace-pre-wrap text-black">{message.text}</p> : null}
                  {(() => {
                    const attachments = message.attachments ?? [];
                    if (!attachments.length) {
                      return null;
                    }
                    return (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {attachments.map((attachment) => (
                          <SupportAttachmentPreview
                            key={attachment.url}
                            attachment={attachment}
                            showDownloadAction
                          />
                        ))}
                      </div>
                    );
                  })()}
                </div>
              ))
            )}
              </div>
            </div>
            </div>
          <div className="w-full space-y-2">
            <div className="flex w-full flex-col gap-2 md:flex-row md:items-end">
              <Textarea
                placeholder="Parašykite žinutę..."
                value={text}
                onChange={(event) => setText(event.target.value)}
                disabled={sending}
                className="w-full resize-none md:min-w-0 md:flex-1"
                rows={3}
              />
              <div className="flex w-full items-center justify-between md:w-auto md:gap-3">
                <label className="flex-none cursor-pointer rounded-lg border border-dashed border-border px-3 py-2 text-xs font-medium text-muted-foreground">
                  <input
                    ref={fileInputRef}
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
                <Button
                  type="button"
                  onClick={handleSend}
                  disabled={sending || (!text.trim() && attachments.length === 0)}
                  className="flex-none"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
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
      </div>
    </MainLayout>
  );
};

export default AdminSupport;
