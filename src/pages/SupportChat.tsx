import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Paperclip, Send } from 'lucide-react';
import { MainLayout } from '@/components/Layout/MainLayout';
import { SupportAttachmentPreview } from '@/components/support/AttachmentPreview';
import api, { SupportAttachmentPayload, SupportMessageResponse } from '@/lib/api';
import { cn } from '@/lib/utils';

const MESSAGE_PAGE_LIMIT = 20;
const BOTTOM_PIN_THRESHOLD = 80;

type ThreadInfo = {
  id: string;
  status: string;
  lastMessageAt: string | null;
};

const SupportChat = () => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<SupportAttachmentPayload[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [thread, setThread] = useState<ThreadInfo | null>(null);
  const [threadLoading, setThreadLoading] = useState(true);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessageResponse[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [olderCursor, setOlderCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const preserveScrollRef = useRef<{ height: number; top: number } | null>(null);
  const scrollToBottomAfterRenderRef = useRef(false);

  const isNearBottom = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return true;
    const gap = container.scrollHeight - container.scrollTop - container.clientHeight;
    return gap <= BOTTOM_PIN_THRESHOLD;
  }, []);

  const scrollToBottom = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, []);

  const loadThread = useCallback(async () => {
    setThreadLoading(true);
    setThreadError(null);
    try {
      const data = await api.support.myThread();
      setThread(data);
      return data;
    } catch {
      setThread(null);
      setMessages([]);
      setThreadError('Nepavyko įkelti pokalbio.');
      return null;
    } finally {
      setThreadLoading(false);
    }
  }, []);

  const loadMessages = useCallback(
    async (cursor?: string, appendOlder = false, refresh = false, initial = false) => {
      if (!thread) return;
      if (appendOlder) {
        setLoadingMore(true);
      } else if (!refresh) {
        setMessagesLoading(true);
        setMessagesError(null);
      }

      try {
        const params: Parameters<typeof api.support.myThreadMessages>[0] = {
          limit: MESSAGE_PAGE_LIMIT,
        };
        if (cursor) {
          params.cursor = cursor;
        }

        const page = await api.support.myThreadMessages(params);
        const normalized = [...page.messages].reverse();

        setHasMore(page.hasMore);
        setOlderCursor(page.nextCursor);

        if (appendOlder) {
          const container = scrollRef.current;
          if (container) {
            preserveScrollRef.current = {
              height: container.scrollHeight,
              top: container.scrollTop,
            };
          }
          setMessages((prev) => [...normalized, ...prev]);
          return;
        }

        if (refresh) {
          const shouldStick = isNearBottom();
          setMessages((prev) => {
            const merged = new Map(prev.map((item) => [item.id, item]));
            normalized.forEach((item) => merged.set(item.id, item));
            return Array.from(merged.values()).sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
            );
          });
          if (shouldStick) {
            scrollToBottomAfterRenderRef.current = true;
          }
          return;
        }

        setMessages(normalized);
        if (initial) {
          scrollToBottomAfterRenderRef.current = true;
        }
      } catch {
        if (!appendOlder && !refresh) {
          setMessagesError('Nepavyko įkelti žinučių.');
        }
      } finally {
        if (appendOlder) {
          setLoadingMore(false);
        } else if (!refresh) {
          setMessagesLoading(false);
        }
      }
    },
    [isNearBottom, thread],
  );

  useEffect(() => {
    void loadThread();
  }, [loadThread]);

  useEffect(() => {
    if (!thread?.id) return;
    setMessages([]);
    setHasMore(false);
    setOlderCursor(null);
    void loadMessages(undefined, false, false, true);
  }, [thread?.id, loadMessages]);

  useEffect(() => {
    if (!thread?.id) return;

    const intervalId = window.setInterval(() => {
      if (loadingMore || messagesLoading) return;
      void loadMessages(undefined, false, true);
    }, 10_000);

    return () => window.clearInterval(intervalId);
  }, [thread?.id, loadMessages, loadingMore, messagesLoading]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const preserve = preserveScrollRef.current;
    if (preserve) {
      const delta = container.scrollHeight - preserve.height;
      container.scrollTop = preserve.top + delta;
      preserveScrollRef.current = null;
      return;
    }

    if (scrollToBottomAfterRenderRef.current) {
      scrollToBottom();
      scrollToBottomAfterRenderRef.current = false;
    }
  }, [messages, scrollToBottom]);

  const handleLoadMore = () => {
    if (!hasMore || loadingMore || !olderCursor) return;
    void loadMessages(olderCursor, true);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    if (files.length === 0) return;

    const getMaxBytesForFile = (file: File) => {
      if (file.type.startsWith('image/')) return 10 * 1024 * 1024;
      if (file.type.startsWith('video/')) return 30 * 1024 * 1024;
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

  const handleSend = async () => {
    if (!thread) return;
    const trimmedText = text.trim();
    if (!trimmedText && attachments.length === 0) return;

    const payload: { text?: string; attachments?: SupportAttachmentPayload[] } = {};
    if (trimmedText) payload.text = trimmedText;
    if (attachments.length) payload.attachments = attachments;

    const shouldStick = isNearBottom();
    setSending(true);
    setSendError(null);
    try {
      const response = await api.support.createMessage(payload);
      setMessages((prev) => [...prev, response]);
      if (shouldStick) {
        scrollToBottomAfterRenderRef.current = true;
      }
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
      <div className="mx-auto flex h-[calc(100dvh-6.5rem)] w-full max-w-4xl flex-col gap-3 px-4 pb-4 pt-3 sm:h-[calc(100dvh-7rem)] sm:pt-4">
        <div className="mb-3 flex flex-col gap-1">
          <h1 className="text-3xl font-bold">Žinutės</h1>
          <p className="text-sm text-muted-foreground">
            Čia galite rašyti mūsų komandai. Visi pranešimai atskirai išsaugomi jūsų paskyroje.
          </p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 rounded-2xl border border-border bg-background/80 p-4 shadow-sm shadow-black/5">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/70 bg-white/80 p-3">
            <div
              ref={scrollRef}
              onScroll={() => {
                // No-op: reading scroll in runtime keeps the browser from snapping to top on updates.
                void isNearBottom();
              }}
              className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1"
            >
              {threadLoading ? (
                <div className="py-10 text-center text-sm text-muted-foreground">Kraunama...</div>
              ) : threadError ? (
                <div className="py-10 text-center text-sm text-destructive">{threadError}</div>
              ) : (
                <>
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
                    <div className="py-10 text-center text-sm text-muted-foreground">Kraunama...</div>
                  ) : messagesError ? (
                    <div className="py-10 text-center text-sm text-destructive">{messagesError}</div>
                  ) : messages.length === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">
                      Pokalbis tuščias. Parašykite pirmą žinutę.
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isUser = message.senderRole === 'user';
                      return (
                        <div
                          key={message.id}
                          className={cn(
                            'flex flex-col space-y-2 px-2',
                            isUser ? 'items-end text-right' : 'items-start text-left',
                          )}
                        >
                          <p className="text-xs text-muted-foreground">
                            {isUser ? 'Jūs' : 'Bus medaus komanda'} •{' '}
                            {new Date(message.createdAt).toLocaleString('lt-LT')}
                          </p>
                          <div
                            className={cn(
                              'max-w-[85%] rounded-2xl px-4 py-2 text-sm text-left shadow-sm',
                              isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-black',
                            )}
                          >
                            {message.text && <p className="whitespace-pre-wrap">{message.text}</p>}
                            {(() => {
                              const messageAttachments = message.attachments ?? [];
                              if (!messageAttachments.length) return null;
                              return (
                                <div className="mt-3 grid gap-2">
                                  {messageAttachments.map((attachment) => (
                                    <SupportAttachmentPreview
                                      key={attachment.url}
                                      attachment={attachment}
                                      showDownloadAction={false}
                                    />
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              )}
            </div>
          </div>

          <div className="space-y-2 rounded-2xl border border-border/70 bg-white/80 p-3">
            {attachments.length ? (
              <div className="flex flex-wrap gap-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.url}
                    className="flex items-center gap-2 rounded-full bg-muted/60 px-3 py-1 text-xs"
                  >
                    <span className="max-w-[160px] truncate">{attachment.url.split('/').pop()}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {sendError ? <div className="text-xs text-destructive">{sendError}</div> : null}

            <div className="flex flex-col gap-2">
              <Textarea
                placeholder="Parašykite žinutę..."
                value={text}
                onChange={(event) => setText(event.target.value)}
                disabled={sending}
                className="w-full resize-none"
                rows={3}
              />
              <div className="flex flex-wrap gap-2">
                <label className="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border border-dashed border-border px-3 py-2 text-xs font-medium text-muted-foreground">
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
                  className="min-w-0 flex-1"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default SupportChat;
