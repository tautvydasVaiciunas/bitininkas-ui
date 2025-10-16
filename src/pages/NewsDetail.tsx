import { useMemo } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import { mapNewsPostFromApi } from "@/lib/types";

const formatDateTime = (date: string) =>
  new Date(date).toLocaleString("lt-LT", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const NewsDetail = () => {
  const params = useParams<{ id: string }>();
  const newsId = params.id;

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["news", newsId],
    enabled: Boolean(newsId),
    queryFn: async () => {
      if (!newsId) {
        throw new Error("Naujiena nerasta");
      }
      const response = await api.news.get(newsId);
      return mapNewsPostFromApi(response);
    },
  });

  const groups = useMemo(() => data?.groups ?? [], [data]);

  if (!newsId) {
    return <Navigate to="/news" replace />;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <Button asChild variant="ghost" className="-ml-2 w-fit">
          <Link to="/news" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Grįžti į naujienas
          </Link>
        </Button>

        {isLoading ? (
          <Card className="overflow-hidden">
            <Skeleton className="h-72 w-full" />
            <CardHeader className="space-y-3">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-8 w-2/3" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-10/12" />
            </CardContent>
          </Card>
        ) : isError ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-destructive">
            <h2 className="text-lg font-semibold">Nepavyko įkelti naujienos.</h2>
            <p className="mt-2 text-sm text-destructive/80">
              {error instanceof Error ? error.message : "Bandykite dar kartą vėliau."}
            </p>
          </div>
        ) : !data ? (
          <div className="rounded-lg border border-muted-foreground/30 bg-muted/10 p-6 text-center text-muted-foreground">
            <h2 className="text-lg font-semibold">Naujiena nerasta</h2>
            <p className="mt-2 text-sm">Galbūt ji buvo pašalinta arba neturite prieigos.</p>
          </div>
        ) : (
          <Card className="overflow-hidden">
            {data.imageUrl ? (
              <div className="max-h-[360px] overflow-hidden">
                <img
                  src={data.imageUrl}
                  alt={data.title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            ) : null}
            <CardHeader className="space-y-4">
              <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>Paskelbta: {formatDateTime(data.createdAt)}</span>
                {data.updatedAt !== data.createdAt ? (
                  <span>Atnaujinta: {formatDateTime(data.updatedAt)}</span>
                ) : null}
              </div>
              <CardTitle className="text-3xl leading-tight">{data.title}</CardTitle>
              {!data.targetAll && groups.length ? (
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-muted text-muted-foreground">
                    Tik pasirinktos grupės
                  </Badge>
                  {groups.map((group) => (
                    <Badge key={group.id} variant="outline">
                      {group.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <Badge variant="secondary" className="w-fit bg-success/90 text-success-foreground">
                  Matoma visiems naudotojams
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose max-w-none whitespace-pre-line text-foreground">
                {data.body}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default NewsDetail;
