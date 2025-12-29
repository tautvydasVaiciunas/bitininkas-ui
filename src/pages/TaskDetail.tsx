import { useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AssignmentStatusBadge } from '@/components/AssignmentStatusBadge';
import api from '@/lib/api';
import { mapAssignmentDetailsFromApi, type AssignmentDetails } from '@/lib/types';
import { Calendar, CalendarClock, ChevronLeft, ClipboardList, Loader2, Lock } from 'lucide-react';

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('lt-LT', { year: 'numeric', month: 'long', day: 'numeric' });
};

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery<AssignmentDetails, Error>({
    queryKey: ['assignments', id, 'details'],
    queryFn: () => api.assignments.details(id ?? '').then(mapAssignmentDetailsFromApi),
    enabled: Boolean(id),
  });

  const steps = useMemo(() => {
    if (!data) return [];
    return [...data.task.steps].sort((a, b) => a.orderIndex - b.orderIndex);
  }, [data]);

  if (!id) {
    return (
      <MainLayout>
        <Card className="shadow-custom">
          <CardContent className="p-12 text-center text-muted-foreground">
            Užduoties ID nerastas.
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="pl-0">
            <ChevronLeft className="mr-2 h-4 w-4" /> Grįžti
          </Button>
          <Card className="shadow-custom">
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (isError || !data) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="pl-0">
            <ChevronLeft className="mr-2 h-4 w-4" /> Grįžti
          </Button>
          <Card className="shadow-custom">
            <CardContent className="p-12 text-center">
              <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">{error instanceof Error ? error.message : 'Nepavyko įkelti užduoties.'}</p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const { assignment, task, completion } = data;
  const completedStepIds = new Set(
    data.progress
      .filter((item) => item.status === 'completed')
      .map((item) => item.taskStepId),
  );
  const todayIso = new Date().toISOString().slice(0, 10);
  const isUpcoming = Boolean(assignment.startDate && assignment.startDate > todayIso);

  return (
    <MainLayout>
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="pl-0 w-fit">
          <ChevronLeft className="mr-2 h-4 w-4" /> Grįžti
        </Button>

        <Card className="shadow-custom">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-2xl">{task.title}</CardTitle>
                <p className="text-muted-foreground">Avilio užduotis</p>
              </div>
              <AssignmentStatusBadge status={assignment.status} dueDate={assignment.dueDate} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {assignment.startDate ? (
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4" />
                  Prad?ia: <span className="text-foreground">{formatDate(assignment.startDate)}</span>
                </div>
              ) : null}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Terminas: <span className="text-foreground">{formatDate(assignment.dueDate)}</span>
              </div>
              {isUpcoming ? (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  U?duotis dar neprasid?jo
                </Badge>
              ) : null}
              <Badge variant="outline">Progresas: {completion}%</Badge>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Žingsniai</h3>
              </div>
              <div className="space-y-2">
                {steps.map((step, index) => {
                  const isCompleted = completedStepIds.has(step.id);
                  return (
                    <div
                      key={step.id}
                      className="rounded-lg border border-border px-4 py-3 flex items-start justify-between gap-4"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {index + 1}. {step.title}
                        </p>
                        {step.contentText ? (
                          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{step.contentText}</p>
                        ) : null}
                      </div>
                      {isCompleted ? <Badge variant="success">Atlikta</Badge> : <Badge variant="outline">Neatlikta</Badge>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {isUpcoming ? (
                <p className="text-sm text-muted-foreground">
                  U?duotis dar neprasid?jo. Vykdyti bus galima nuo {formatDate(assignment.startDate)}.
                </p>
              ) : (
                <Button asChild>
                  <Link to={`/tasks/${assignment.id}/run`}>Vykdyti u?duot?</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

