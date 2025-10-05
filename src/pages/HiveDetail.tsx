import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import api, { type AssignmentResponse, type TaskResponse } from '@/lib/api';
import { resolveAssignmentUiStatus } from '@/lib/assignmentStatus';
import { MapPin, Calendar, Edit, Archive, Box, ChevronRight } from 'lucide-react';

export default function HiveDetail() {
  const { id } = useParams();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['hive', id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) {
        throw new Error('Missing hive id');
      }

      const [hive, assignments, tasks] = await Promise.all([
        api.hives.details(id),
        api.assignments.list({ hiveId: id }),
        api.tasks.list(),
      ]);

      const taskMap = new Map<string, TaskResponse>(tasks.map((task) => [task.id, task]));

      const assignmentEntries = await Promise.all(
        assignments.map(async (assignment) => {
          try {
            const details = await api.assignments.details(assignment.id);
            return {
              assignment,
              task: details.task ?? taskMap.get(assignment.taskId),
              completion: details.completion,
            };
          } catch (error) {
            console.error('Failed to fetch assignment details for hive', error);
            return {
              assignment,
              task: taskMap.get(assignment.taskId) ?? null,
              completion: 0,
            };
          }
        })
      );

      return { hive, assignments: assignmentEntries };
    },
  });

  const hive = data?.hive;

  const assignments = useMemo(() => data?.assignments ?? [], [data]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('lt-LT', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getStatusBadge = (status: AssignmentResponse['status'], dueDate: string) => {
    const uiStatus = resolveAssignmentUiStatus(status, dueDate);
    const variants: Record<string, { variant: 'default' | 'destructive' | 'success' | 'secondary'; label: string }> = {
      not_started: { variant: 'secondary', label: 'Nepradėta' },
      in_progress: { variant: 'default', label: 'Vykdoma' },
      done: { variant: 'success', label: 'Atlikta' },
      overdue: { variant: 'destructive', label: 'Vėluojama' },
    };

    const config = uiStatus === 'overdue' ? variants.overdue : variants[status] ?? { variant: 'secondary', label: status };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <MainLayout>
        <Card className="shadow-custom">
          <CardContent className="p-12 text-center text-muted-foreground">Kraunama...</CardContent>
        </Card>
      </MainLayout>
    );
  }

  if (isError || !hive) {
    return (
      <MainLayout>
        <Card className="shadow-custom">
          <CardContent className="p-12 text-center">
            <Box className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Avilys nerastas</h3>
            <p className="text-muted-foreground mb-6">Avilys su šiuo ID neegzistuoja</p>
            <Button asChild>
              <Link to="/hives">Grįžti į avilius</Link>
            </Button>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{hive.label}</h1>
              <Badge variant={hive.status === 'active' ? 'success' : 'secondary'}>
                {hive.status === 'active'
                  ? 'Aktyvus'
                  : hive.status === 'paused'
                    ? 'Pristabdyta'
                    : 'Archyvuota'}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-muted-foreground">
              {hive.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {hive.location}
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Sukurta: {formatDate(hive.createdAt ?? new Date().toISOString())}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline">
              <Edit className="mr-2 w-4 h-4" />
              Redaguoti
            </Button>
            <Button variant="outline">
              <Archive className="mr-2 w-4 h-4" />
              Archyvuoti
            </Button>
          </div>
        </div>

        {/* Details Card */}
        <Card className="shadow-custom">
          <CardHeader>
            <CardTitle>Informacija</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pavadinimas</p>
                <p className="font-medium">{hive.label}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Lokacija</p>
                <p className="font-medium">{hive.location ?? 'Nenurodyta'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Karalienės metai</p>
                <p className="font-medium">{hive.queenYear ?? 'Nenurodyta'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Sukurta</p>
                <p className="font-medium">{formatDate(hive.createdAt ?? new Date().toISOString())}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Statusas</p>
                <p className="font-medium">
                  {hive.status === 'active'
                    ? 'Aktyvus'
                    : hive.status === 'paused'
                      ? 'Pristabdyta'
                      : 'Archyvuota'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="tasks" className="space-y-6">
          <TabsList>
            <TabsTrigger value="tasks">Užduotys</TabsTrigger>
            <TabsTrigger value="history">Istorija</TabsTrigger>
            <TabsTrigger value="settings">Nustatymai</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks">
            <Card className="shadow-custom">
              <CardHeader>
                <CardTitle>Užduotys</CardTitle>
              </CardHeader>
              <CardContent>
                {assignments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Šiam aviliui nėra priskirtų užduočių
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {assignments.map(({ assignment, task, completion }) => (
                      <div key={assignment.id} className="py-4 first:pt-0 last:pb-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between">
                              <h4 className="font-semibold">{task?.title ?? 'Nežinoma užduotis'}</h4>
                              {getStatusBadge(assignment.status, assignment.dueDate)}
                            </div>
                            {task?.description && (
                              <p className="text-sm text-muted-foreground">{task.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>Terminas: {formatDate(assignment.dueDate)}</span>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Progresas</span>
                                <span className="font-medium">{completion}%</span>
                              </div>
                              <Progress value={completion} className="h-2" />
                            </div>
                          </div>
                          <Button asChild size="sm">
                            <Link to={`/tasks/${assignment.id}/run`}>
                              Vykdyti
                              <ChevronRight className="ml-2 w-4 h-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="shadow-custom">
              <CardHeader>
                <CardTitle>Istorija</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Veiksmų istorija bus rodoma čia
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="shadow-custom">
              <CardHeader>
                <CardTitle>Nustatymai</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Avilio redagavimo forma bus čia
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
