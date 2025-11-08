import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import api, { HttpError } from "@/lib/api";
import { mapPaginatedNewsFromApi, type NewsPost } from "@/lib/types";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { applyImageFallback, inferMediaType, resolveMediaUrl, FALLBACK_MEDIA_SRC } from "@/lib/media";

const PAGE_SIZE = 6;

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("lt-LT", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const buildSnippet = (body: string) => {
  const normalized = body.replace(/\s+/g, " ").trim();
  if (normalized.length <= 220) {
    return normalized;
  }
  return `${normalized.slice(0, 220)}…`;
};

const News = () => {
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["news", "list"],
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    queryFn: async ({ pageParam }) => {
      const response = await api.news.list({ page: pageParam, limit: PAGE_SIZE });
      return mapPaginatedNewsFromApi(response);
    },
  });

  const { toast } = useToast();
  const errorToastRef = useRef<{ dismiss: () => void } | null>(null);

  useEffect(() => {
    if (isError && error instanceof HttpError && error.status >= 500) {
      if (!errorToastRef.current) {
        errorToastRef.current = toast({
          variant: "destructive",
          title: "Nepavyko įkelti naujienų",
          description: "Įvyko serverio klaida. Bandykite dar kartą.",
          action: (
            <ToastAction
              altText="Bandyti dar kartą"
              onClick={() => {
                errorToastRef.current?.dismiss();
                errorToastRef.current = null;
                refetch();
              }}
            >
              Bandyti dar kartą
            </ToastAction>
          ),
        });
      }
    } else if (!isError && errorToastRef.current) {
      errorToastRef.current.dismiss();
      errorToastRef.current = null;
    }
  }, [isError, error, toast, refetch]);

  const newsItems = useMemo<NewsPost[]>(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data]
  );

  const errorMessage =
    error instanceof HttpError ? error.message : "Bandykite dar kartą vėliau.";

  return (
    <MainLayout showBreadcrumbs={false}>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">Naujienos</h1>
          <p className="text-muted-foreground">
            Naujausia informacija apie bitininkystės darbus ir bendruomenės aktualijas.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="overflow-hidden">
                <div className="grid gap-0 md:grid-cols-[minmax(0,320px),1fr]">
                  <div className="relative aspect-[16/9] w-full md:aspect-auto md:h-full">
                    <Skeleton className="absolute inset-0 h-full w-full" />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <CardHeader className="space-y-3 md:space-y-4">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-6 w-3/4" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                    <CardFooter className="mt-auto flex flex-col gap-3 border-t border-border/60 bg-muted/10 p-6 md:flex-row md:items-center md:justify-between">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-10 w-32" />
                    </CardFooter>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : isError ? (
          <div className="space-y-4 rounded-lg border border-destructive/50 bg-destructive/5 p-6 text-destructive">
            <div>
              <p className="font-medium">Nepavyko įkelti naujienų.</p>
              <p className="text-sm text-destructive/80">{errorMessage}</p>
            </div>
            <Button variant="outline" onClick={() => refetch()}>
              Bandyti dar kartą
            </Button>
          </div>
        ) : newsItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-muted-foreground/30 p-12 text-center">
            <h2 className="text-xl font-semibold">Naujienų kol kas nėra</h2>
            <p className="mt-2 text-muted-foreground">
              Sekite naujienas – kai tik jos bus paskelbtos, jos iškart pasirodys šiame sąraše.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="space-y-6">
              {newsItems.map((post) => {
                const coverUrl = resolveMediaUrl(post.imageUrl);
                const coverType = inferMediaType(null, coverUrl);

                return (
                  <Card key={post.id} className="overflow-hidden">
                    <div className="grid gap-0 md:grid-cols-[minmax(0,320px),1fr]">
                      <div className="relative aspect-[16/9] w-full md:aspect-auto md:h-full">
                        <NewsMediaPreview url={coverUrl} mediaType={coverType} title={post.title} />
                      </div>
                      <div className="flex flex-1 flex-col">
                        <CardHeader className="space-y-3 md:space-y-4">
                          <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                            {formatDate(post.createdAt)}
                          </span>
                          <CardTitle className="text-2xl leading-tight md:text-3xl">{post.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1">
                          <p className="text-base text-muted-foreground md:text-lg">
                            {buildSnippet(post.body)}
                          </p>
                        </CardContent>
                        <CardFooter className="mt-auto flex flex-col gap-3 border-t border-border/60 bg-muted/10 p-6 md:flex-row md:items-center md:justify-between">
                          <div className="text-sm text-muted-foreground">
                            {post.targetAll
                              ? 'Matoma visiems nariams'
                              : post.groups.length > 0
                                ? `Matoma grupėms: ${post.groups.map((group) => group.name).join(', ')}`
                                : 'Matoma pasirinktoms grupėms'}
                          </div>
                          <Button asChild>
                            <Link to={`/news/${post.id}`}>Skaityti</Link>
                          </Button>
                        </CardFooter>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {hasNextPage ? (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Kraunama...
                    </>
                  ) : (
                    "Įkelti daugiau"
                  )}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default News;

type NewsMediaPreviewProps = {
  url: string | null;
  mediaType: 'image' | 'video' | null;
  title: string;
};

const NewsMediaPreview = ({ url, mediaType, title }: NewsMediaPreviewProps) => {
  const [videoError, setVideoError] = useState(false);
  const baseMediaClass = 'absolute inset-0 h-full w-full object-cover';

  if (mediaType === 'video') {
    if (!url || videoError) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-center text-sm font-medium uppercase tracking-wide text-muted-foreground">
          <span className="px-4">
            {videoError ? 'Nepavyko įkelti vaizdo įrašo' : 'Vaizdo įrašas nepateiktas'}
          </span>
        </div>
      );
    }

    return (
      <video
        src={url}
        controls
        preload="metadata"
        className={`${baseMediaClass} bg-black`}
        crossOrigin="anonymous"
        onError={() => setVideoError(true)}
      />
    );
  }

  const src = url ?? FALLBACK_MEDIA_SRC;

  return (
    <img
      src={src}
      alt={title}
      className={baseMediaClass}
      loading="lazy"
      crossOrigin="anonymous"
      onError={(event) => applyImageFallback(event.currentTarget)}
    />
  );
};
