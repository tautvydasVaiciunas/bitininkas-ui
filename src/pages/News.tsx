import { useEffect, useMemo, useRef } from "react";
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
    () => data?.pages.flatMap((page) => page.items) ?? [],
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
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardHeader className="space-y-2">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-6 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-32" />
                </CardFooter>
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
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {newsItems.map((post) => (
                <Card key={post.id} className="flex h-full flex-col overflow-hidden">
                  {post.imageUrl ? (
                    <div className="h-48 w-full overflow-hidden">
                      <img
                        src={post.imageUrl}
                        alt={post.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ) : null}
                  <CardHeader className="space-y-3">
                    <span className="text-sm text-muted-foreground">{formatDate(post.createdAt)}</span>
                    <CardTitle className="text-2xl leading-tight">{post.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-muted-foreground">{buildSnippet(post.body)}</p>
                  </CardContent>
                  <CardFooter>
                    <Button asChild>
                      <Link to={`/news/${post.id}`}>Skaityti</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
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
