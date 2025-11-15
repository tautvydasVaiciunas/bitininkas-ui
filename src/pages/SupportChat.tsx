import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import api, { SupportAttachmentPayload, SupportMessageResponse } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Loader2, Paperclip, Send } from 'lucide-react';

const MESSAGE_PAGE_LIMIT = 20;

const SupportChat = () => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<SupportAttachmentPayload[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();

  const { data: thread } = useQuery(['support', 'thread'], () => api.support.myThread());

  const messagesQuery = useInfiniteQuery({
    queryKey: ['support', 'messages'],
    queryFn: async ({ pageParam }) => {
      return api.support.myThreadMessages({
        limit: MESSAGE_PAGE_LIMIT,
        cursor: pageParam,
      });
    },
    getNextPageParam: (lastPage) => {
      const last = lastPage.at(-1);
      return last?.createdAt;
    },
  });

  const flattenMessages = messagesQuery.data?.pages.flat() ?? [];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'auto' });
  }, [flattenMessages.length]);

  const mutation = useMutation({
    mutationFn: (payload: { text?: string; attachments?: SupportAttachmentPayload[] }) =>
      api.support.createMessage(payload),
    onSuccess: () => {
      setText('');
      setAttachments([]);
      queryClient.invalidateQueries({ queryKey: ['support', 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['support', 'thread'] });
    },
  });

  const isSending = mutation.isLoading;

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.currentTarget.files;
    if (!files?.length) return;

    setIsUploading(true);
    try {
      const uploaded: SupportAttachmentPayload[] = [];
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append('file', file);
        const { url } = await api.support.uploadAttachment(form);
        uploaded.push({
          url,
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
    } finally {
      setIsUploading(false);
      event.currentTarget.value = '';
    }
  };

  const handleSend = () => {
    if (!text.trim() && attachments.length === 0) {
      return;
    }

    mutation.mutate({
      text: text.trim() || undefined,
      attachments,
    });
  };

  const showLoadMore = messagesQuery.hasNextPage;

  return (
    <MainLayout>
      <div className="mx-auto w-full max-w-4xl space-y-6 py-10 px-4">
        <h1 className="text-2xl font-semibold">Susirašymas su Bus medaus bitininku</h1>
        <div className="border border-border rounded-2xl bg-background/80 p-4 shadow-sm shadow-black/5">
          <div className="max-h-[60vh] overflow-y-auto space-y-4 px-2" ref={scrollRef}>
            {showLoadMore && (
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => messagesQuery.fetchNextPage()}
                  disabled={messagesQuery.isFetchingNextPage}
                >
                  {messagesQuery.isFetchingNextPage ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    'Rodyti senesnes žinutes'
                  )}
                </Button>
              </div>
            )}
            {messagesQuery.isLoading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Kraunama...</div>
            ) : flattenMessages.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Pokalbis tuščias. Parašykite pirmą žinutę!
              </div>
            ) : (
              flattenMessages
                .slice()
                .reverse()
                .map((message) => {
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
                        {isUser ? 'Jūs' : 'Bus medaus Bitininkas'} ·{' '}
                        {new Date(message.createdAt).toLocaleString('lt-LT')}
                      </p>
                      <div
                        className={cn(
                          'max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm',
                          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {message.text && <p className="whitespace-pre-wrap">{message.text}</p>}
                        {message.attachments?.length ? (
                          <div className="mt-3 grid gap-2">
                            {message.attachments.map((attachment) => (
                              <AttachmentPreview key={attachment.url} attachment={attachment} />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })
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
                disabled={isSending || messagesQuery.isLoading}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={isSending || (!text.trim() && attachments.length === 0)}
              >
                {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
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
        className="h-32 w-full max-w-[240px] rounded-lg object-cover"
        loading="lazy"
      />
    );
  }

  if (attachment.kind === 'video') {
    return (
      <video
        src={attachment.url}
        controls
        className="h-32 w-full max-w-[240px] rounded-lg bg-black object-cover"
      />
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
      className="text-xs text-primary underline"
    >
      Atidaryti failą
    </a>
  );
};

export default SupportChat;
