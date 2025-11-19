import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import api, { type HttpError } from '@/lib/api';
import { mapAssignmentDetailsFromApi, type AssignmentDetails } from '@/lib/types';
import { Calendar } from 'lucide-react';

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('lt-LT', { year: 'numeric', month: 'long', day: 'numeric' });
};

export default function TaskPreview() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();

  const query = useQuery<
    AssignmentDetails & { isActive: boolean },
    HttpError | Error
  >({
    queryKey: ['assignments', assignmentId, 'preview'],
    queryFn: () => api.assignments.preview(assignmentId ?? '').then((response) => response),
    enabled: Boolean(assignmentId),
  });

  const mapped = useMemo(
    () => (query.data ? mapAssignmentDetailsFromApi(query.data) : null),
    [query.data],
  );

  const assignment = mapped?.assignment;
  const steps = useMemo(() => {
    if (!assignment) return [];
    return [...assignment.task.steps].sort((a, b) => a.orderIndex - b.orderIndex);
  }, [assignment]);

  const isActive = query.data?.isActive ?? false;

  if (query.isLoading) {
    return (
      <MainLayout>
        <Card>
          <CardContent>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-6 w-48 mb-4" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  if (query.isError) {
    return (
      <MainLayout>
        <Card>
          <CardContent>
            <CardTitle>Užduotis nerasta</CardTitle>
            <p>Neleidžiama peržiūrėti šios užduoties.</p>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  if (!assignment) {
    return (
      <MainLayout>
        <Card>
          <CardContent>
            <CardTitle>Užduotis nerasta</CardTitle>
            <p>Ši užduotis šiuo metu negalima.</p>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{assignment.task.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{assignment.task.description}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  Pradžia: {formatDate(assignment.assignment.startDate)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Terminas: {formatDate(assignment.assignment.dueDate)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Žingsniai</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {steps.length === 0 && <p>Nėra žingsnių.</p>}
            {steps.map((step, index) => (
              <div key={step.id} className="rounded border p-3">
                <p className="text-sm font-medium">{index + 1}. {step.title}</p>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vykdymas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-2">
              {isActive ? (
                <div className="mt-4 flex justify-end">
                  <Button
                    size="lg"
                    variant="default"
                    className="w-full justify-center sm:w-auto"
                    onClick={() => navigate(`/tasks/${assignment.assignment.id}/run`)}
                  >
                    Vykdyti užduotį
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Ši užduotis dar neprasidėjo. Pradžios data: {formatDate(assignment.assignment.startDate)}.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
