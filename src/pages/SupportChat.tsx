import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Paperclip, Send } from 'lucide-react';
import { MainLayout } from '@/components/Layout/MainLayout';
import { SupportAttachmentPreview } from '@/components/support/AttachmentPreview';
import api, { SupportAttachmentPayload, SupportMessageResponse } from '@/lib/api';
import { cn } from '@/lib/utils';

const MESSAGE_PAGE_LIMIT = 20;

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

  const scrollToBottom = useCallback(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'auto' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

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
    async (cursor?: string, appendOlder = false) => {
      if (!thread) return;
      if (appendOlder) {
        setLoadingMore(true);
      } else {
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
    },
    [thread],
  );

  useEffect(() => {
    void loadThread();
  }, [loadThread]);

  useEffect(() => {
    if (thread?.id) {
      setMessages([]);
      setHasMore(false);
      setOlderCursor(null);
      void loadMessages();
    }
  }, [thread?.id, loadMessages]);

  const handleLoadMore = () => {
    if (!hasMore || loadingMore || !olderCursor) return;
    void loadMessages(olderCursor, true);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    if (files.length === 0) {
      return;
    }

    const uploaded: SupportAttachmentPayload[] = [];
    let uploadError = false;

    for (const file of files) {
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

    if (uploadError) {
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
    if (trimmedText) {
      payload.text = trimmedText;
    }
    if (attachments.length) {
      payload.attachments = attachments;
    }

    setSending(true);
    setSendError(null);
    try {
      const response = await api.support.createMessage(payload);
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
      <div className="mx-auto w-full max-w-4xl space-y-6 py-10 px-4">
        <h1 className="text-2xl font-semibold">Susisiek</h1>
        <div className="border border-border rounded-2xl bg-background/80 p-4 shadow-sm shadow-black/5">
          <div className="max-h-[60vh] overflow-y-auto space-y-4 px-2" ref={scrollRef}>
            {threadLoading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Kraunama...</div>
            ) : threadError ? (
              <div className="py-10 text-center text-sm text-destructive">{threadError}</div>
            ) : (
              <>
                {showLoadMore && (
                  <div className="flex justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                    >
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
                    Pokalbis tuščias. Parašykite pirmą žinutę!
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
                          {isUser ? 'Jūs' : 'Bus medaus Bitininkas'} •{' '}
                          {new Date(message.createdAt).toLocaleString('lt-LT')}
                        </p>
                        <div
                          className={cn(
                            'max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm',
                            isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                          )}
                        >
                  {message.text && <p className="whitespace-pre-wrap">{message.text}</p>}
                  {(() => {
                    const attachments = message.attachments ?? [];
                    if (!attachments.length) {
                      return null;
                    }
                    return (
                      <div className="mt-3 grid gap-2">
                        {attachments.map((attachment) => (
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

          <div className="mt-4 space-y-2">
            {attachments.length ? (
              <div className="flex flex-wrap gap-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.url}
                    className="flex items-center gap-2 rounded-full bg-muted/60 px-3 py-1 text-xs"
                  >
                    <span className="truncate max-w-[160px]">{attachment.url.split('/').pop()}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {sendError ? (
              <div className="text-xs text-destructive">{sendError}</div>
            ) : null}
            <div className="flex items-center gap-2">
              <label className="cursor-pointer rounded-lg border border-dashed border-border px-3 py-2 text-xs font-medium text-muted-foreground">
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
              <Textarea
                placeholder="Parašykite žinutę..."
                value={text}
                onChange={(event) => setText(event.target.value)}
                disabled={sending}
                className="flex-1 resize-none"
                rows={3}
              />
              <Button type="button" onClick={handleSend} disabled={sending || (!text.trim() && attachments.length === 0)}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default SupportChat;
