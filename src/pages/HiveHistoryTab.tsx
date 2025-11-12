import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import api, { HttpError, type HiveHistoryEventResponse } from '@/lib/api';
import {
  describeHiveHistoryEvent,
  formatHiveHistoryTimestamp,
  getHiveHistoryActorLabel,
  getHiveHistoryEventLabel,
} from '@/lib/hiveHistory';

type HiveHistoryTabProps = {
  hiveId: string;
};

type HiveHistoryResponse = {
  data: HiveHistoryEventResponse[];
  page: number;
  limit: number;
  total: number;
};

const PAGE_SIZE = 10;

export default function HiveHistoryTab({ hiveId }: HiveHistoryTabProps) {
  const [page, setPage] = useState(1);

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

  const isNotFound =
    error instanceof HttpError && (error.status === 404 || error.status === 204);
  const showEmpty = (!isLoading && items.length === 0) || isNotFound;

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
        <div className="text-center py-8 text-muted-foreground">
          Nėra įvykių.
        </div>
      );
    }

    return (
      <>
        <ul className="divide-y divide-border">
          {items.map((event) => {
            const descriptor = describeHiveHistoryEvent(event);
            const actorLabel = getHiveHistoryActorLabel(event);

            return (
              <li key={event.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{getHiveHistoryEventLabel(event.type)}</Badge>
                      <p className="font-semibold">{descriptor.title}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{descriptor.description}</p>
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
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Ankstesnis
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages || isFetching}
              onClick={() => setPage((prev) => prev + 1)}
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
  }, [data, isError, isFetching, isLoading, isNotFound, items, showEmpty, currentPage, totalPages]);

  return <>{content}</>;
}
